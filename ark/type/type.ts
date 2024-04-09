import {
	type BaseMeta,
	BaseSchema,
	Disjoint,
	type Morph,
	type Predicate,
	type Schema,
	type distillIn,
	type distillOut,
	type inferIntersection
} from "@arktype/schema"
import type { Constructor, Hkt, array, conform } from "@arktype/util"
import { Generic, type validateParameterString } from "./generic.js"
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
			// TODO: validateUninstantiatedGeneric
			return new Generic(params, def, $) as never
		}
		// otherwise, treat as a tuple expression. technically, this also allows
		// non-expression tuple definitions to be parsed, but it's not a supported
		// part of the API as specified by the associated types
		return $.parseTypeRoot(args)
	}
	return parser as never
}

export class Type<
	/** @ts-expect-error allow assignment from instances */
	out t = unknown,
	$ = any
> extends BaseSchema<t, $> {
	constructor(
		public definition: unknown,
		public $: Scope<$>
	) {
		const root = $.parseTypeRoot(definition) as {} as Schema<t>
		super(root.traverse as never)
	}

	declare [Hkt.instantiate]: (
		args: this[Hkt.args]
	) => Type<(typeof args)[0], (typeof args)[1]>

	and<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>, $> {
		const result = this.intersect(this.$.parseTypeRoot(def))
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $> {
		return new Type(super.union(this.$.parseTypeRoot(def)), this.$) as never
	}
}

export type DefinitionParser<$> = <def>(
	def: validateDefinition<def, $, bindThis<def>>
) => def

export type validateTypeRoot<def, $> = validateDefinition<def, $, bindThis<def>>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>
