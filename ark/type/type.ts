import type {
	BaseAttributes,
	CheckResult,
	inferMorphOut,
	inferNarrow,
	Morph,
	Out,
	Predicate,
	Root
} from "@arktype/schema"
import {
	arkKind,
	builtins,
	In,
	inferred,
	registry,
	TraversalState
} from "@arktype/schema"
import type {
	AbstractableConstructor,
	BuiltinObjectKind,
	BuiltinObjects,
	conform,
	entryOf,
	evaluate,
	fromEntries,
	join,
	Json,
	Primitive,
	returnOf,
	unionToTuple
} from "@arktype/util"
import { CompiledFunction, transform } from "@arktype/util"
import type {
	inferDefinition,
	validateDeclared,
	validateDefinition
} from "./parser/definition.ts"
import type { GenericParamsParseError } from "./parser/generic.ts"
import { parseGenericParams } from "./parser/generic.ts"
import type { inferIntersection } from "./parser/semantic/intersections.ts"
import { type Scanner } from "./parser/string/shift/scanner.ts"
import type {
	IndexOneOperator,
	IndexZeroOperator,
	MorphAst,
	TupleInfixOperator
} from "./parser/tuple.ts"
import type { Module, Scope } from "./scope.ts"
import { bindThis } from "./scope.ts"
import { type Ark } from "./scopes/ark.ts"

export type TypeParser<$> = {
	// Parse and check the definition, returning either the original input for a
	// valid definition or a string representing an error message.
	<const def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

	// Spread version of a tuple expression
	<const zero, const one, const rest extends readonly unknown[]>(
		_0: zero extends IndexZeroOperator ? zero : validateTypeRoot<zero, $>,
		_1: zero extends "keyof"
			? validateTypeRoot<one, $>
			: zero extends "instanceof"
			? conform<one, AbstractableConstructor>
			: zero extends "==="
			? conform<one, unknown>
			: conform<one, IndexOneOperator>,
		..._2: zero extends "==="
			? rest
			: zero extends "instanceof"
			? conform<rest, readonly AbstractableConstructor[]>
			: one extends TupleInfixOperator
			? one extends ":"
				? [Predicate<extractIn<inferTypeRoot<zero, $>>>]
				: one extends "=>"
				? // TODO: centralize
				  [Morph<extractOut<inferTypeRoot<zero, $>>, unknown>]
				: one extends "@"
				? [string | BaseAttributes]
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

type validateCases<cases, $> = {
	// adding keyof $ explicitly provides key completions for aliases
	[k in keyof cases | keyof $]?: k extends validateTypeRoot<k, $>
		? (In: inferTypeRoot<k, $>) => unknown
		: never
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

export type ArkKinds = {
	node: Root
	generic: Generic
	module: Module
}

export const addArkKind = <kind extends ArkKind>(
	value: Omit<ArkKinds[kind], arkKind> & { [arkKind]?: kind },
	kind: kind
): ArkKinds[kind] =>
	Object.defineProperty(value, arkKind, {
		value: kind,
		enumerable: false
	}) as never

export type arkKind = typeof arkKind

export type ArkKind = keyof ArkKinds

export const hasArkKind = <kind extends ArkKind>(
	value: unknown,
	kind: kind
): value is ArkKinds[kind] => (value as any)?.[arkKind] === kind

export type DefinitionParser<$> = <def>(
	def: validateDefinition<def, $, bindThis<def>>
) => def

export type KeyCheckKind = "distilled" | "strict" | "loose"

export type TypeConfig = {
	keys?: KeyCheckKind
	mustBe?: string
}

registry().register(TraversalState, "state")

export class Type<t = unknown, $ = any> extends CompiledFunction<
	(data: unknown) => CheckResult<extractOut<t>>
> {
	declare [inferred]: t
	declare inferMorph: t
	declare infer: extractOut<t>
	declare inferIn: extractIn<t>

	config: TypeConfig
	root: Root<t>
	condition = ""
	alias: string
	allows: this["root"]["allows"]
	json: Json

	constructor(
		public definition: unknown,
		public scope: Scope
	) {
		const root = parseTypeRoot(definition, scope) as Root<t>
		super(In, `return true ? { data: ${In} } : { problems: [] } `)
		// const state = new ${registry().reference("state")}();
		// const morphs = [];
		// 	for(let i = 0; i < morphs.length; i++) {
		// 	    morphs[i]()
		// 	}
		// 	return state.finalize(${In});
		this.root = root
		this.allows = root.allows
		this.config = scope.config
		this.json = this.root.json
		this.alias = this.root.alias
	}

	configure(config: TypeConfig) {
		this.config = { ...this.config, ...config }
		return this
	}

	// TODO: should return out
	from(literal: this["infer"]) {
		return literal
	}

	fromIn(literal: this["inferIn"]) {
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

	morph<morph extends Morph<extractOut<t>>>(
		morph: morph
	): Type<(In: this["inferIn"]) => Out<inferMorphOut<ReturnType<morph>>>, $>
	morph<morph extends Morph<extractOut<t>>, def>(
		morph: morph,
		outValidator: validateTypeRoot<def, $>
	): Type<
		(In: this["inferIn"]) => Out<
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
			? (In: this["inferIn"]) => Out<inferNarrow<this["infer"], def>>
			: inferNarrow<this["infer"], def>,
		$
	> {
		return this as never //new Type(this.root.constrain("predicate", def), this.scope) as never
	}

	array(): Type<t[], $> {
		return new Type(this.root.array(), this.scope) as never
	}

	keyof(): Type<keyof this["inferIn"], $> {
		return new Type(this.root.keyof(), this.scope) as never
	}

	assert(data: unknown): extractOut<t> {
		const result = this.call(null, data)
		return result.problems ? result.problems.throw() : result.data
	}

	// TODO: parse these
	equals<other>(other: Type<other>): this is Type<other, $> {
		return this.root === (other.root as unknown)
	}

	extends<other>(other: Type<other>): this is Type<other, $> {
		return this.root.extends(other.root)
	}
}

const parseTypeRoot = (def: unknown, scope: Scope, args?: BoundArgs) =>
	scope.parseDefinition(def, { args: args ?? bindThis(), baseName: "type" })

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
			args: transform(g.parameters, ([, name]) => [name, builtins().unknown])
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
			const argNodes = transform(parameters, ([i, param]) => [
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

export type BoundArgs = Record<string, Root>

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

export type extractIn<t> = includesMorphs<t> extends true
	? extractMorphs<t, "in">
	: t

export type extractOut<t> = includesMorphs<t> extends true
	? extractMorphs<t, "out">
	: t

type includesMorphs<t> = [
	t,
	extractMorphs<t, "in">,
	t,
	extractMorphs<t, "out">
] extends [extractMorphs<t, "in">, t, extractMorphs<t, "out">, t]
	? false
	: true

type extractMorphs<t, io extends "in" | "out"> = t extends MorphAst<
	infer i,
	infer o
>
	? io extends "in"
		? i
		: o
	: t extends TerminallyInferredObjectKind | Primitive
	? t
	: { [k in keyof t]: extractMorphs<t[k], io> }

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind =
	| ReturnType<ArkConfig["preserve"]>
	| BuiltinObjects[Exclude<BuiltinObjectKind, "Object" | "Array">]
