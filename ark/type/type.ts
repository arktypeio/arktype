import {
	Disjoint,
	arkKind,
	hasArkKind,
	keywordNodes,
	type ArkResult,
	type BaseMeta,
	type Morph,
	type Out,
	type Predicate,
	type PrimitiveConstraintKind,
	type Schema,
	type TypeNode,
	type applyMorph,
	type constrain,
	type constraintKindOf,
	type distillConstrainableIn,
	type distillConstrainableOut,
	type distillIn,
	type distillOut,
	type includesMorphs,
	type inferIntersection,
	type inferMorphOut,
	type inferNarrow,
	type inferred
} from "@arktype/schema"
import {
	Callable,
	flatMorph,
	type Constructor,
	type Json,
	type array,
	type conform
} from "@arktype/util"
import {
	generic,
	validateUninstantiatedGeneric,
	type Generic,
	type validateParameterString
} from "./generic.js"
import type {
	inferDefinition,
	validateDeclared,
	validateDefinition
} from "./parser/definition.js"
import {
	parseGenericParams,
	type GenericParamsParseError
} from "./parser/generic.js"
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
				? [Morph<distillOut<inferTypeRoot<zero, $>>, unknown>]
				: one extends "@"
				? [string | BaseMeta]
				: [validateTypeRoot<rest[0], $>]
			: []
	): Type<inferTypeRoot<[zero, one, ...rest], $>, $>

	<params extends string, const def>(
		params: `<${validateParameterString<params>}>`,
		def: validateDefinition<
			def,
			$,
			{
				[param in parseGenericParams<params>[number]]: unknown
			}
		>
	): Generic<parseGenericParams<params>, def, $>
}

export type DeclarationParser<$> = <preinferred>() => {
	// for some reason, making this a const parameter breaks preinferred validation
	type: <def>(
		def: validateDeclared<preinferred, def, $, bindThis<def>>
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
			return validateUninstantiatedGeneric(generic(params, def, $) as never)
		}
		// otherwise, treat as a tuple expression. technically, this also allows
		// non-expression tuple definitions to be parsed, but it's not a supported
		// part of the API as specified by the associated types
		return $.parseTypeRoot(args)
	}
	return parser as never
}

export class Type<t = unknown, $ = any> extends Callable<
	(data: unknown) => ArkResult<distillIn<t>, distillOut<t>>
> {
	declare [inferred]: t
	declare infer: distillOut<t>

	root: TypeNode<t>
	allows: this["root"]["allows"]
	description: string
	expression: string
	json: Json

	constructor(
		public definition: unknown,
		public $: Scope
	) {
		const root = $.parseTypeRoot(definition) as {} as TypeNode<t>
		super(root.apply as never, { bind: root })
		this.root = root
		this.allows = root.allows.bind(root)
		this.json = root.json
		this.description = this.root.description
		this.expression = this.root.expression
	}

	get in(): Type<distillConstrainableIn<t>, $> {
		return new Type(this.root.in, this.$) as never
	}

	get out(): Type<distillConstrainableOut<t>, $> {
		return new Type(this.root.out, this.$) as never
	}

	keyof(): Type<keyof this["in"]["infer"], $> {
		return new Type(this.root.keyof(), this.$) as never
	}

	intersect<r extends Type>(
		r: r
	): Type<inferIntersection<this["infer"], r["infer"]>, t> | Disjoint {
		const result = this.root.intersect(r.root)
		return hasArkKind(result, "node")
			? new Type(result, this.$)
			: (result as any)
	}

	and<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>, $> {
		const result = this.intersect(this.$.parseTypeRoot(def))
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $> {
		return new Type(
			this.root.or(this.$.parseTypeRoot(def).root),
			this.$
		) as never
	}

	get<key extends PropertyKey>(...path: readonly (key | Type<key>)[]): this {
		return this
	}

	equals<r>(r: Type<r>): this is Type<r, $> {
		return this.root.equals(r.root)
	}

	extract(other: Type): Type<t, $> {
		return new Type(this.root.extract(other.root), this.$)
	}

	exclude(other: Type): Type<t, $> {
		return new Type(this.root.exclude(other.root), this.$)
	}

	array(): Type<t[], $> {
		return new Type(this.root.array(), this.$) as never
	}

	// add the extra inferred intersection so that a variable of Type
	// can be narrowed without other branches becoming never
	extends<r>(other: Type<r>): this is Type<r, $> & { [inferred]?: r } {
		const intersection = this.intersect(other as never)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}

	configure(configOrDescription: BaseMeta | string): this {
		return new Type(
			this.root.configureShallowDescendants(configOrDescription),
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

	morph<morph extends Morph<this["infer"]>, def = never>(
		morph: morph,
		outValidator?: validateTypeRoot<def, $>
	): Type<applyMorph<t, morph, inferTypeRoot<def, $>>, $>
	morph(morph: Morph, outValidator?: unknown): unknown {
		return new Type(this.root.morph(morph, outValidator), this.$)
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

	constrain<
		kind extends PrimitiveConstraintKind,
		const schema extends Schema<kind>
	>(
		kind: conform<kind, constraintKindOf<this["in"]["infer"]>>,
		schema: schema
	): Type<constrain<t, kind, schema>, $> {
		return new Type(this.root.constrain(kind, schema), this.$) as never
	}
}

export type DefinitionParser<$> = <def>(
	def: validateDefinition<def, $, bindThis<def>>
) => def

export type validateTypeRoot<def, $> = validateDefinition<def, $, bindThis<def>>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>
