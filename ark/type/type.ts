import {
	type BaseMeta,
	BaseSchema,
	Disjoint,
	type Morph,
	type NodeDef,
	type Out,
	type Predicate,
	type PrimitiveConstraintKind,
	type Schema,
	type ambient,
	type constrain,
	type constraintKindOf,
	type distillConstrainableIn,
	type distillConstrainableOut,
	type distillIn,
	type distillOut,
	type includesMorphs,
	type inferIntersection,
	type inferMorphOut,
	type inferNarrow
} from "@arktype/schema"
import type { Constructor, array, conform } from "@arktype/util"
import {
	Generic,
	type validateParameterString,
	validateUninstantiatedGeneric
} from "./generic.js"
import type {
	inferDefinition,
	validateDeclared,
	validateDefinition
} from "./parser/definition.js"
import { parseGenericParams } from "./parser/generic.js"
import type {
	IndexOneOperator,
	IndexZeroOperator,
	TupleInfixOperator
} from "./parser/tuple.js"
import type { Scope, bindThis } from "./scope.js"

export type TypeParser<$> = {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

	// Spread version of a tuple expression
	<const zero, const one, const rest extends array>(
		_0: zero extends IndexZeroOperator ? zero : validateTypeRoot<zero, $>,
		_1: zero extends "keyof"
			? validateTypeRoot<one, $>
			: zero extends "instanceof"
				? conform<one, Constructor>
				: zero extends "==="
					? conform<one, unknown>
					: conform<one, IndexOneOperator>,
		..._2: zero extends "==="
			? rest
			: zero extends "instanceof"
				? conform<rest, readonly Constructor[]>
				: one extends TupleInfixOperator
					? one extends ":"
						? [Predicate<distillIn<inferTypeRoot<zero, $>>>]
						: one extends "=>"
							? [
									Morph<
										distillOut<inferTypeRoot<zero, $>>,
										unknown
									>
								]
							: one extends "@"
								? [string | BaseMeta]
								: [validateTypeRoot<rest[0], $>]
					: []
	): Type<inferTypeRoot<[zero, one, ...rest], $>, $>

	<params extends string, const def>(
		params: `<${validateParameterString<params>}>`,
		def: validateDefinition<
			def,
			$ & {
				[param in parseGenericParams<params>[number]]: unknown
			}
		>
	): Generic<parseGenericParams<params>, def, $>
}

export type DeclarationParser<$> = <preinferred>() => {
	// for some reason, making this a const parameter breaks preinferred validation
	type: <def>(
		def: validateDeclared<preinferred, def, $ & ambient & bindThis<def>>
	) => Type<preinferred, $>
}

export const createTypeParser = <$>($: Scope): TypeParser<$> => {
	const parser = (...args: unknown[]): Type | Generic => {
		if (args.length === 1) {
			// treat as a simple definition
			return $.parseTypeRoot(args[0])
		}
		if (
			args.length === 2 &&
			typeof args[0] === "string" &&
			args[0][0] === "<" &&
			args[0].at(-1) === ">"
		) {
			// if there are exactly two args, the first of which looks like <${string}>,
			// treat as a generic
			const params = parseGenericParams(args[0].slice(1, -1))
			const def = args[1]
			return validateUninstantiatedGeneric(
				new Generic(params, def, $) as never
			)
		}
		// otherwise, treat as a tuple expression. technically, this also allows
		// non-expression tuple definitions to be parsed, but it's not a supported
		// part of the API as specified by the associated types
		return $.parseTypeRoot(args)
	}
	return parser as never
}

export class Type<t = unknown, $ = any> extends BaseSchema<t, $> {
	constructor(
		public definition: unknown,
		public $: Scope<$>
	) {
		const root = $.parseTypeRoot(definition) as {} as Schema<t>
		super(root.traverse as never)
	}

	// get in(): Type<distillConstrainableIn<t>, $> {
	// 	return new Type(super.in, this.$) as never
	// }

	// get out(): Type<distillConstrainableOut<t>, $> {
	// 	return new Type(super.out, this.$) as never
	// }

	// keyof(): Type<keyof this["in"]["infer"], $> {
	// 	return new Type(super.keyof(), this.$) as never
	// }

	// intersect<r extends Type>(
	// 	r: r
	// ): Type<inferIntersection<this["infer"], r["infer"]>, t> | Disjoint {
	// 	const result = super.intersect(r.root)
	// 	return hasArkKind(result, "schema")
	// 		? new Type(result, this.$)
	// 		: (result as any)
	// }

	and<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>, $> {
		const result = this.intersect(this.$.parseTypeRoot(def))
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $> {
		return new Type(super.union(this.$.parseTypeRoot(def)), this.$) as never
	}

	// get<key extends PropertyKey>(...path: readonly (key | Type<key>)[]): this {
	// 	return this
	// }

	// equals<r>(r: Type<r>): this is Type<r, $> {
	// 	return super.equals(r.root)
	// }

	// extract(other: Type): Type<t, $> {
	// 	return new Type(super.extract(other.root), this.$)
	// }

	// exclude(other: Type): Type<t, $> {
	// 	return new Type(super.exclude(other.root), this.$)
	// }

	// // add the extra inferred intersection so that a variable of Type
	// // can be narrowed without other branches becoming never
	// extends<r>(other: Type<r>): this is Type<r, $> & { [inferred]?: r } {
	// 	const intersection = this.intersect(other as never)
	// 	return (
	// 		!(intersection instanceof Disjoint) &&
	// 		this.equals(intersection as never)
	// 	)
	// }

	array(): Type<t[], $> {
		return new Type(super.array(), this.$) as never
	}

	configure(configOrDescription: BaseMeta | string): this {
		return new Type(
			super.configureShallowDescendants(configOrDescription),
			this.$
		) as never
	}

	describe(description: string): this {
		return this.configure(description)
	}

	// TODO: should return out
	from(literal: this["in"]["infer"]): this["out"]["infer"] {
		return literal as never
	}

	morph<morph extends Morph<this["infer"]>, outValidatorDef = never>(
		morph: morph,
		outValidator?: validateTypeRoot<outValidatorDef, $>
	): Type<
		(
			In: distillConstrainableIn<t>
		) => Out<
			[outValidatorDef] extends [never]
				? inferMorphOut<morph>
				: distillConstrainableOut<inferTypeRoot<outValidatorDef, $>>
		>,
		$
	>
	morph(morph: Morph, outValidator?: unknown): unknown {
		return new Type(super.morph(morph, outValidator as never), this.$)
	}

	// TODO: based on below, should maybe narrow morph output if used after
	narrow<def extends Predicate<distillConstrainableOut<t>>>(
		def: def
	): Type<
		includesMorphs<t> extends true
			? (In: distillIn<t>) => Out<inferNarrow<this["infer"], def>>
			: inferNarrow<this["infer"], def>,
		$
	> {
		return this.constrain("predicate" as any, def) as never
	}

	assert(data: unknown): this["infer"] {
		const result = this(data)
		return result.errors ? result.errors.throw() : result.out
	}
}

export type DefinitionParser<$> = <def>(
	def: validateDefinition<def, $ & ambient & bindThis<def>>
) => def

export type validateTypeRoot<def, $> = validateDefinition<
	def,
	$ & ambient & bindThis<def>
>

export type inferTypeRoot<def, $> = inferDefinition<
	def,
	$ & ambient & bindThis<def>
>
