import {
	inferred,
	keywords,
	type ArkResult,
	type BaseMeta,
	type Morph,
	type Out,
	type Predicate,
	type TypeNode,
	type distill,
	type extractIn,
	type extractOut,
	type includesMorphs,
	type inferIntersection,
	type inferMorphOut,
	type inferNarrow,
	type validateConstraintArg
} from "@arktype/schema"
import {
	Callable,
	morph,
	type Constructor,
	type Json,
	type List,
	type conform
} from "@arktype/util"
import type { applySchema } from "../schema/shared/utils.js"
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
import { arkKind } from "./util.js"

export type TypeParser<$> = {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

	// Spread version of a tuple expression
	<const zero, const one, const rest extends List>(
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
				? [Predicate<extractIn<inferTypeRoot<zero, $>>>]
				: one extends "=>"
				? // TODO: centralize
				  [Morph<extractOut<inferTypeRoot<zero, $>>, unknown>]
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

export const createTypeParser = <$>(scope: Scope): TypeParser<$> => {
	const parser = (...args: unknown[]): Type | Generic => {
		if (args.length === 1) {
			// treat as a simple definition
			return new Type(args[0], scope)
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
			return validateUninstantiatedGeneric(generic(params, def, scope) as never)
		}
		// otherwise, treat as a tuple expression. technically, this also allows
		// non-expression tuple definitions to be parsed, but it's not a supported
		// part of the API as specified by the associated types
		return new Type(args, scope)
	}
	return parser as never
}

export type DefinitionParser<$> = <def>(
	def: validateDefinition<def, $, bindThis<def>>
) => def

export class Type<t = unknown, $ = any> extends Callable<
	(data: unknown) => ArkResult<distill<extractOut<t>>>
> {
	declare [inferred]: t
	// TODO: in/out?
	declare infer: distill<extractOut<t>>

	root: TypeNode<t>
	allows: this["root"]["allows"]
	description: string
	json: Json

	constructor(
		public definition: unknown,
		public scope: Scope
	) {
		const root = parseTypeRoot(definition, scope) as TypeNode<t>
		super(root.apply, root)
		this.root = root
		this.allows = root.allows
		this.json = root.json
		this.description = this.root.description
	}

	configure(configOrDescription: BaseMeta | string): this {
		return new Type(
			this.root.configureShallowDescendants(configOrDescription),
			this.scope
		) as never
	}

	describe(description: string): this {
		return this.configure(description)
	}

	// TODO: should return out
	from(literal: this["in"]["infer"]) {
		return literal
	}

	// TODO: Morph intersections, ordering
	and<def>(
		def: validateTypeRoot<def, $>
	): Type<inferIntersection<t, inferTypeRoot<def, $>>, $> {
		return new Type(
			this.root.and(parseTypeRoot(def, this.scope)),
			this.scope
		) as never
	}

	or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $> {
		return new Type(
			this.root.or(parseTypeRoot(def, this.scope)),
			this.scope
		) as never
	}

	// TODO: standardize these
	morph<morph extends Morph<this["infer"]>>(
		morph: morph
	): Type<(In: this["in"]["infer"]) => Out<inferMorphOut<ReturnType<morph>>>, $>
	morph<morph extends Morph<this["infer"]>, def>(
		morph: morph,
		outValidator: validateTypeRoot<def, $>
	): Type<
		(In: this["in"]["infer"]) => Out<
			// TODO: validate overlapping
			// inferMorphOut<ReturnType<morph>> &
			extractOut<inferTypeRoot<def, $>>
		>,
		$
	>
	morph(morph: Morph, outValidator?: unknown) {
		// TODO: tuple expression for out validator
		outValidator
		return this as never
		// return new Type(
		//     this.root.constrain("morph", morph),
		//     this.scope
		// ) as never
	}

	// TODO: based on below, should maybe narrow morph output if used after
	narrow<def extends Predicate<extractOut<t>>>(
		def: def
	): Type<
		includesMorphs<t> extends true
			? (In: this["in"]["infer"]) => Out<inferNarrow<this["infer"], def>>
			: inferNarrow<this["infer"], def>,
		$
	> {
		return new Type(this.root.constrain("predicate", def), this.scope) as never
	}

	array(): Type<t[], $> {
		return new Type(this.root.array(), this.scope) as never
	}

	keyof(): Type<keyof this["in"]["infer"], $> {
		return new Type(this.root.keyof(), this.scope) as never
	}

	assert(data: unknown): this["infer"] {
		const result = this.call(null, data)
		return result.errors ? result.errors.throw() : result.out
	}

	divisor<const limit extends validateConstraintArg<"divisor", this["infer"]>>(
		limit: limit
	): Type<applySchema<t, "divisor", limit>, $> {
		return new Type(
			this.root.constrain("min", limit as number),
			this.scope
		) as never
	}

	// min<const limit extends validatedBoundSchema<"min", this["infer"]>>(
	// 	limit: limit
	// ): Type<applyBound<t, "min", limit>, $> {
	// 	return new Type(
	// 		this.root.constrain("min", limit as number),
	// 		this.scope
	// 	) as never
	// }

	// max<limit extends validatedBoundSchema<"max", this["infer"]>>(
	// 	limit: limit
	// ): Type<applyBound<t, "max", limit>, $> {
	// 	return new Type(
	// 		this.root.constrain("max", limit as number),
	// 		this.scope
	// 	) as never
	// }

	// minLength<limit extends validatedBoundSchema<"minLength", this["infer"]>>(
	// 	limit: limit
	// ): Type<applyBound<t, "minLength", limit>, $> {
	// 	return new Type(
	// 		this.root.constrain("minLength", limit as number),
	// 		this.scope
	// 	) as never
	// }

	// maxLength<limit extends validatedBoundSchema<"maxLength", this["infer"]>>(
	// 	limit: limit
	// ): Type<applyBound<t, "maxLength", limit>, $> {
	// 	return new Type(
	// 		this.root.constrain("maxLength", limit as number),
	// 		this.scope
	// 	) as never
	// }

	// after<limit extends validatedBoundSchema<"after", this["infer"]>>(
	// 	limit: limit
	// ): Type<applyBound<t, "after", limit>, $> {
	// 	return new Type(
	// 		this.root.constrain("after", limit as number),
	// 		this.scope
	// 	) as never
	// }

	// before<limit extends validatedBoundSchema<"before", this["infer"]>>(
	// 	limit: limit
	// ): Type<applyBound<t, "before", limit>, $> {
	// 	return new Type(
	// 		this.root.constrain("before", limit as number),
	// 		this.scope
	// 	) as never
	// }

	equals<def>(
		other: validateTypeRoot<def, $>
	): this is Type<inferTypeRoot<def, $>, $> {
		return this.root.equals(parseTypeRoot(other, this.scope))
	}

	extends<def>(
		other: validateTypeRoot<def, $>
	): this is Type<inferTypeRoot<def, $>, $> {
		return this.root.extends(parseTypeRoot(other, this.scope))
	}

	private inCache?: Type<extractIn<t>, $>;
	get in() {
		this.inCache ??= new Type(this.root.in, this.scope) as never
		return this.inCache
	}

	outCache?: Type<extractOut<t>, $>
	get out() {
		this.outCache ??= new Type(this.root.out, this.scope) as never
		return this.outCache
	}

	toString() {
		return this.description
	}
}

const parseTypeRoot = (def: unknown, scope: Scope, args?: BoundArgs) =>
	scope.parseDefinition(def, {
		args: args ?? scope.bindThis(),
		baseName: "type"
	})

export type validateTypeRoot<def, $> = validateDefinition<def, $, bindThis<def>>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>

type validateParameterString<params extends string> =
	parseGenericParams<params> extends GenericParamsParseError<infer message>
		? message
		: params

export const validateUninstantiatedGeneric = (g: Generic) => {
	// the unconstrained instantiation of the generic is not used for now
	// other than to eagerly validate that the def does not contain any errors
	g.scope.parseDefinition(
		g.definition,
		// once we support constraints on generic parameters, we'd use
		// the base type here: https://github.com/arktypeio/arktype/issues/796
		{
			baseName: "generic",
			args: morph(g.parameters, (_, name) => [name, keywords.unknown])
		}
	)
	return g
}

export const generic = (
	parameters: string[],
	definition: unknown,
	scope: Scope
) => {
	return Object.assign(
		(...args: unknown[]) => {
			const argNodes = morph(parameters, (i, param) => [
				param,
				parseTypeRoot(args[i], scope)
			])
			const root = parseTypeRoot(definition, scope, argNodes)
			return new Type(root, scope)
		},
		{
			[arkKind]: "generic",
			parameters,
			definition,
			scope
			// $ is only needed at compile-time
		} satisfies Omit<GenericProps, "$">
	) as unknown as Generic
}

// Comparing to Generic directly doesn't work well, so we compare to only its props
export type GenericProps<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = {
	[arkKind]: "generic"
	$: $
	parameters: params
	definition: def
	scope: Scope
}

export type BoundArgs = Record<string, TypeNode>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
export type Generic<
	params extends string[] = string[],
	def = unknown,
	$ = any
> = {
	<args>(
		...args: conform<
			args,
			{
				[i in keyof params]: validateTypeRoot<args[i & keyof args], $>
			}
		>
	): Type<inferDefinition<def, $, bindGenericInstantiation<params, $, args>>, $>
} & GenericProps<params, def, $>

type bindGenericInstantiation<params extends string[], $, args> = {
	[i in keyof params & `${number}` as params[i]]: inferTypeRoot<
		args[i & keyof args],
		$
	>
}
