import {
	$ark,
	BaseScope,
	hasArkKind,
	LazyGenericRoot,
	parseGeneric,
	RootModule,
	type AliasDefEntry,
	type ArkSchemaRegistry,
	type ArkSchemaScopeConfig,
	type BaseNode,
	type BaseParseContext,
	type BaseParseContextInput,
	type BaseParseOptions,
	type BaseRoot,
	type GenericAst,
	type GenericParamAst,
	type GenericParamDef,
	type Morph,
	type NodeInput,
	type NodeKind,
	type PreparsedNodeResolution,
	type PrivateDeclaration,
	type RootSchema,
	type TypeMeta,
	type arkKind,
	type exportedNameOf,
	type nodeOfKind,
	type reducibleKindOf,
	type toInternalScope,
	type writeDuplicateAliasError,
	type writeShallowCycleErrorMessage
} from "@ark/schema"
import {
	Scanner,
	defineLazily,
	enumValues,
	flatMorph,
	hasOwn,
	isArray,
	isThunk,
	throwParseError,
	type Brand,
	type Dict,
	type ErrorMessage,
	type ErrorType,
	type JsonStructure,
	type anyOrNever,
	type array,
	type inferred,
	type noInfer,
	type noSuggest
} from "@ark/util"
import { setEngine } from "arksets/internal"
import type { InferredMorph } from "./attributes.ts"
import type { DeclarationParser } from "./declare.ts"
import { InternalFnParser, type FnParser } from "./fn.ts"
import {
	parseGenericParamName,
	type Generic,
	type GenericDeclaration,
	type GenericParser,
	type ParameterString,
	type baseGenericConstraints,
	type parseGenericParams,
	type parseValidGenericParams
} from "./generic.ts"
import type { Ark, type } from "./keywords/keywords.ts"
import { InternalMatchParser, type MatchParser } from "./match.ts"
import type {
	BoundModule,
	Module,
	Submodule,
	exportScope,
	instantiateExport
} from "./module.ts"
import type {
	NaryIntersectionParser,
	NaryMergeParser,
	NaryPipeParser,
	NaryUnionParser
} from "./nary.ts"
import type { GenericInstantiationAst } from "./parser/ast/generic.ts"
import type { DefAst, InferredAst } from "./parser/ast/infer.ts"
import {
	shallowDefaultableMessage,
	shallowOptionalMessage
} from "./parser/ast/validate.ts"
import {
	parseInnerDefinition,
	type inferDefinition
} from "./parser/definition.ts"
import type { ParsedOptionalProperty } from "./parser/property.ts"
import type { BranchOperator } from "./parser/reduce/shared.ts"
import type { ParsedDefaultableProperty } from "./parser/shift/operator/default.ts"
import type { parseString } from "./parser/string.ts"
import type { TupleExpression } from "./parser/tupleExpressions.ts"
import {
	InternalTypeParser,
	type DefinitionParser,
	type EnumeratedTypeParser,
	type InstanceOfTypeParser,
	type SchemaParser,
	type TypeParser,
	type UnitTypeParser,
	type ValueOfTypeParser
} from "./type.ts"

// a bundler trusting sideEffects drops a bare import
$ark.sets ??= setEngine

/** The convenience properties attached to `scope` */
export type ScopeParserAttachments =
	// map over to remove call signatures
	Omit<ScopeParser, never>

export interface ArkScopeConfig extends ArkSchemaScopeConfig {}

export interface ScopeParser {
	<const def>(
		def: scope.validate<def>,
		config?: ArkScopeConfig
	): Scope<scope.infer<def>>

	define: <const def>(def: scope.validate<def>) => def
}

export type ModuleParser = <const def>(
	def: scope.validate<def>,
	config?: ArkScopeConfig
) => scope.infer<def> extends infer $ ?
	Module<{ [k in exportedNameOf<$>]: $[k] }>
:	never

export type bindThis<def> = { this: Def<def> }

/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = Brand<def, "unparsed">

/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
export type UnparsedScope = "$"

/** These are legal as values of a scope but not as definitions in other contexts */
type PreparsedResolution = PreparsedNodeResolution

type bootstrapAliases<def> = {
	[k in Exclude<keyof def, GenericDeclaration>]: def[k] extends (
		PreparsedResolution
	) ?
		def[k] extends { t: infer g extends GenericAst } ? g
		: def[k] extends Module<infer $> | BoundModule<infer $, any> ? Submodule<$>
		: def[k]
	: def[k] extends (() => infer thunkReturn extends PreparsedResolution) ?
		thunkReturn extends { t: infer g extends GenericAst } ? g
		: thunkReturn extends Module<infer $> | BoundModule<infer $, any> ?
			Submodule<$>
		:	thunkReturn
	:	Def<def[k]>
} & {
	[k in keyof def & GenericDeclaration as extractGenericName<k>]: GenericAst<
		parseValidGenericParams<extractGenericParameters<k>, bootstrapAliases<def>>,
		def[k],
		UnparsedScope
	>
}

type inferBootstrapped<$> = {
	[name in keyof $]: $[name] extends Def<infer def> ?
		inferDefinition<def, $, {}>
	: $[name] extends { t: infer g extends GenericAst } ? bindGenericToScope<g, $>
	: // should be submodule
		$[name]
} & unknown

export type bindGenericToScope<g extends GenericAst, $> = GenericAst<
	g["paramsAst"],
	g["bodyDef"],
	g["$"] extends UnparsedScope ? $ : g["$"],
	$
>

type extractGenericName<k> =
	k extends GenericDeclaration<infer name> ? name : never

type extractGenericParameters<k> =
	// using extends GenericDeclaration<string, infer params>
	// causes TS fail to infer a narrowed result as of 5.5
	k extends `${string}<${infer params}>` ? ParameterString<params> : never

export type resolutionToAst<alias extends string, resolution> =
	[resolution] extends [anyOrNever] ? InferredAst<resolution, alias>
	: resolution extends Def<infer def> ? DefAst<def, alias>
	: resolution extends { [arkKind]: "module"; root: infer root } ?
		InferredAst<root, alias>
	: resolution extends GenericAst ? resolution
	: InferredAst<resolution, alias>

export type moduleKeyOf<$> = {
	[k in keyof $]: $[k] extends { [arkKind]: "module" } ?
		[$[k]] extends [anyOrNever] ?
			never
		:	k & string
	:	never
}[keyof $]

export interface ArkTypeRegistry extends ArkSchemaRegistry {
	typeAttachments?: Ark.boundTypeAttachments<any>
	ambient: exportScope<Ark>
}

export const $arkTypeRegistry: ArkTypeRegistry = $ark as never

export interface InternalScope {
	constructor: typeof InternalScope
}

export class InternalScope<$ extends {} = {}> extends BaseScope<$> {
	get ambientAttachments(): Ark.boundTypeAttachments<$> | undefined {
		if (!$arkTypeRegistry.typeAttachments) return
		return this.memo(
			"ambientAttachments",
			flatMorph(Object.keys($arkTypeRegistry.typeAttachments), (_, k) => [
				k,
				this.type[k as never]
			]) as never
		)
	}

	private keywordConfigOf(qualifiedName: string): TypeMeta | undefined {
		const { keywords } = this.cfg
		return hasOwn(keywords, qualifiedName) ? keywords[qualifiedName] : undefined
	}

	protected preparseEntry(alias: string, def: unknown): AliasDefEntry {
		const firstParamIndex = alias.indexOf("<")
		if (firstParamIndex === -1) {
			if (hasArkKind(def, "module") || hasArkKind(def, "generic"))
				return [alias, def]

			const qualifiedName =
				this.name === "ark" ? alias
				: alias === "root" ? this.name
				: `${this.name}.${alias}`

			// a thunk reads its config when called, so ark doesn't fix it
			if (isThunk(def)) {
				const thunk = def
				return [
					alias,
					() => {
						const resolution = thunk()
						if (hasArkKind(resolution, "generic")) return resolution
						const config = this.keywordConfigOf(qualifiedName)
						return config ?
								([resolution, "@", config] satisfies TupleExpression)
							:	resolution
					}
				]
			}

			const config = this.keywordConfigOf(qualifiedName)
			return [
				alias,
				config ? ([def, "@", config] satisfies TupleExpression) : def
			]
		}

		if (alias[alias.length - 1] !== ">") {
			throwParseError(
				`'>' must be the last character of a generic declaration in a scope`
			)
		}

		const name = alias.slice(0, firstParamIndex)
		if (hasArkKind(def, "generic"))
			throwParseError(writeParameterizedGenericKeyMessage(name))
		const paramString = alias.slice(firstParamIndex + 1, -1)
		const genericName = name[0] === "#" ? name.slice(1) : name

		return [
			name,
			// use a thunk definition for the generic so that we can parse
			// constraints within the current scope
			new LazyGenericRoot(
				() =>
					parseGeneric(
						this.parseGenericParams(paramString, { alias: genericName }),
						def,
						this as never,
						genericName
					),
				{ attach: { paramsDef: paramString, bodyDef: def } }
			)
		]
	}

	parseGenericParams(
		def: string,
		opts: BaseParseOptions
	): array<GenericParamDef> {
		return parseGenericParamName(
			new Scanner(def),
			[],
			this.createParseCtx({
				...opts,
				def,
				prefix: "generic"
			})
		)
	}

	protected normValue(resolution: unknown): unknown {
		if (isThunk(resolution) && !hasArkKind(resolution, "generic"))
			return resolution()
		return resolution
	}

	protected preparseOwn(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput {
		return {
			...opts,
			def,
			prefix: opts.alias ?? "type"
		}
	}

	parseOwn(def: unknown, ctx: BaseParseContext): BaseRoot {
		const isScopeAlias = ctx.alias && ctx.alias in this.aliases

		// if the definition being parsed is not a scope alias and is not a
		// generic instantiation (i.e. opts don't include args), add `this` as a resolution.

		// if we're parsing a nested string, ctx.args will have already been set
		if (!isScopeAlias && !ctx.args) ctx.args = { this: ctx.id }

		const result = parseInnerDefinition(def, ctx)

		if (isArray(result)) {
			if (result[1] === "=") return throwParseError(shallowDefaultableMessage)

			if (result[1] === "?") return throwParseError(shallowOptionalMessage)
		}

		return result
	}

	unit: UnitTypeParser<$> = value => this.units([value]) as never

	valueOf: ValueOfTypeParser<$> = tsEnum =>
		this.units(enumValues(tsEnum)) as never

	enumerated: EnumeratedTypeParser<$> = (...values) =>
		this.units(values) as never

	instanceOf: InstanceOfTypeParser<$> = ctor =>
		this.node("proto", { proto: ctor }, { reduced: true }) as never

	or: NaryUnionParser<$> = (...defs: unknown[]) =>
		this.fin(
			this.node("union", {
				branches: defs.map(def => this.parse(def))
			})
		) as never

	and: NaryIntersectionParser<$> = (...defs: unknown[]) =>
		defs.reduce<BaseRoot>(
			(node, def) => node.and(this.parse(def)),
			this.intrinsic.unknown
		) as never

	merge: NaryMergeParser<$> = (...defs: unknown[]) =>
		defs.reduce<BaseRoot>(
			(node, def) => node.merge(this.parse(def)),
			this.intrinsic.object
		) as never

	pipe: NaryPipeParser<$> = (...morphs: Morph[]) =>
		this.intrinsic.unknown.pipe(...morphs) as never

	fn: InternalFnParser = new InternalFnParser(this as never)
	match: InternalMatchParser = new InternalMatchParser(this as never)

	declare = (): { type: InternalTypeParser } => ({
		type: this.type
	})

	define<def>(def: def): def {
		return def
	}

	type: InternalTypeParser = new InternalTypeParser(this as never)

	static scope: ScopeParser = ((def: Dict, config: ArkScopeConfig = {}) =>
		new InternalScope(def, config)) as never

	static module: ModuleParser = ((def: Dict, config: ArkScopeConfig = {}) =>
		InternalScope.scope(def as never, config).export()) as never
}

// builtin scopes are named so a precompiled program can key them
export const keywordModule = (
	def: Dict,
	config: ArkScopeConfig & { name: string }
): RootModule => {
	const module = new RootModule({})
	let exports: RootModule | undefined
	const resolve = (name: string) =>
		(exports ??= new InternalScope(def, config, true).exportLazily())[
			name as never
		]
	for (const name in def)
		if (name[0] !== "#") defineLazily(module, name, resolve)
	return module
}

export const writeParameterizedGenericKeyMessage = <name extends string>(
	name: name
): writeParameterizedGenericKeyMessage<name> =>
	`${name} is defined by a generic, so its key must not declare parameters`

export type writeParameterizedGenericKeyMessage<name extends string> =
	`${name} is defined by a generic, so its key must not declare parameters`

export const scope: ScopeParser = Object.assign(InternalScope.scope, {
	define: (def: unknown) => def as never
} satisfies ScopeParserAttachments)

type InferredDefinition = { [inferred]: unknown }

export declare namespace scope {
	export type validate<def> = {
		[k in keyof def]: k extends noSuggest ?
			// avoid trying to parse meta keys when spreading modules
			unknown
		: parseScopeKey<k, def>["params"] extends infer params ?
			params extends array<GenericParamAst> ?
				params["length"] extends 0 ?
					// checking against Type reads ArkEnv.meta, which a meta inferred from a scope importing Types references (#1644)
					def[k] extends InferredDefinition | PreparsedResolution ? def[k]
					: k extends (
						PrivateDeclaration<infer name extends keyof def & string>
					) ?
						ErrorType<writeDuplicateAliasError<name>>
					:	// inferring def through the shallow cycle check would expand it for every key
						noInfer<validateAlias<k, def[k], bootstrapAliases<def>>>
				: def[k] extends Generic ?
					ErrorType<
						writeParameterizedGenericKeyMessage<
							parseScopeKey<k, def>["name"] & string
						>
					>
				:	type.validate<
						def[k],
						bootstrapAliases<def>,
						baseGenericConstraints<params>
					>
			:	// if we get here, the params failed to parse- return the error
				params
		:	never
	}

	export type infer<def> = inferBootstrapped<bootstrapAliases<def>>
}

type validateAlias<k, def, $> =
	shallowCycleMessageOf<k, def, $> extends infer message extends string ?
		ErrorMessage<message>
	:	type.validate<def, $, {}>

type shallowCycleMessageOf<k, def, $> =
	def extends string ?
		aliasNameOf<k> extends infer name extends string ?
			name extends (
				shallowClosure<shallowReferencesOf<parseString<def, $, {}>, $>, $>
			) ?
				shallowCycleOf<name, parseString<def, $, {}>, $, [name]> extends (
					infer cycle extends string[]
				) ?
					writeShallowCycleErrorMessage<name, cycle>
				:	never
			:	undefined
		:	never
	:	undefined

type aliasNameOf<k> = k extends PrivateDeclaration<infer name> ? name : k

type aliasAstOf<name, $> =
	name extends string ?
		(
			name extends keyof $ ?
				$[name]
			:	$[PrivateDeclaration<name> & keyof $]
		) extends Def<infer def extends string> ?
			parseString<def, $, {}>
		:	undefined
	:	never

type shallowReferencesOf<ast, $> =
	ast extends readonly [infer l, infer operator, infer r] ?
		operator extends "def" ? r
		: operator extends ShallowOperator ?
			| shallowReferencesOf<l, $>
			| (pipesFromMorph<l, operator, $> extends true ? never
			  :	shallowReferencesOf<r, $>)
		:	never
	:	never

type ShallowOperator = BranchOperator | "#"

// what a morph pipes to is a structural position, not a shallow reference
type pipesFromMorph<l, operator, $> =
	operator extends "|>" ? includesMorphAst<l, $, never> : false

type includesMorphAst<ast, $, seen> =
	ast extends InferredAst<infer t> ?
		[Extract<t, InferredMorph>] extends [never] ?
			false
		:	true
	: ast extends DefAst<infer def, infer alias> ?
		def extends string ?
			alias extends seen ?
				false
			:	includesMorphAst<aliasAstOf<alias, $>, $, seen | alias>
		:	// assume a tuple, object or Type definition may hold a morph
			true
	: ast extends GenericInstantiationAst ? true
	: ast extends readonly unknown[] ?
		true extends includesMorphAst<ast[number], $, seen> ?
			true
		:	false
	:	false

type shallowClosure<frontier, $, reached = never> =
	[frontier] extends [never] ? reached
	:	shallowClosure<
			Exclude<
				shallowReferencesOf<aliasAstOf<frontier, $>, $>,
				frontier | reached
			>,
			$,
			frontier | reached
		>

type shallowCycleOf<name, ast, $, path extends unknown[]> =
	ast extends readonly [infer l, infer operator, infer r] ?
		operator extends "def" ?
			r extends name ? path
			: r extends path[number] ? never
			: name extends shallowClosure<r, $, Exclude<path[number], name>> ?
				shallowCycleOf<name, aliasAstOf<r, $>, $, [...path, r]>
			:	never
		: operator extends ShallowOperator ?
			[shallowCycleOf<name, l, $, path>] extends [never] ?
				pipesFromMorph<l, operator, $> extends true ?
					never
				:	shallowCycleOf<name, r, $, path>
			:	shallowCycleOf<name, l, $, path>
		:	never
	:	never

export interface Scope<$ = {}> {
	t: $
	[arkKind]: "scope"
	config: ArkScopeConfig
	references: readonly BaseNode[]
	json: JsonStructure
	exportedNames: array<exportedNameOf<$>>

	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	aliases: Record<string, unknown>
	internal: toInternalScope<$>

	defineSchema<const def extends RootSchema>(schema: def): def

	node<kind extends NodeKind>(
		kind: kind,
		input: NodeInput<kind>,
		opts?: BaseParseOptions
	): nodeOfKind<reducibleKindOf<kind>>

	unit: UnitTypeParser<$>
	enumerated: EnumeratedTypeParser<$>
	valueOf: ValueOfTypeParser<$>
	instanceOf: InstanceOfTypeParser<$>

	type: TypeParser<$>

	match: MatchParser<$>

	fn: FnParser<$>

	declare: DeclarationParser<$>

	define: DefinitionParser<$>

	generic: GenericParser<$>

	schema: SchemaParser<$>

	import(): Module<{ [k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k] }>
	import<names extends exportedNameOf<$>[]>(
		...names: names
	): BoundModule<
		{
			[k in names[number] as PrivateDeclaration<k>]: $[k]
		} & unknown,
		$
	>

	export(): Module<{ [k in exportedNameOf<$>]: $[k] }>
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): BoundModule<
		{
			[k in names[number]]: $[k]
		} & unknown,
		$
	>

	resolve<name extends exportedNameOf<$>>(
		name: name
	): instantiateExport<$[name], $>
}

export interface ScopeConstructor {
	new <$ = {}>(...args: ConstructorParameters<typeof InternalScope>): Scope<$>
	scope: ScopeParser
	module: ModuleParser
}

export const Scope: ScopeConstructor = InternalScope as never

export type parseScopeKey<k, def> =
	// trying to infer against GenericDeclaration here directly also fails as of TS 5.5
	k extends `${infer name}<${infer params}>` ?
		parseGenericScopeKey<name, params, def>
	:	{
			name: k
			params: []
		}

type parseGenericScopeKey<name extends string, params extends string, def> = {
	name: name
	params: parseGenericParams<params, bootstrapAliases<def>>
}

export type InnerParseResult =
	| BaseRoot
	| ParsedOptionalProperty
	| ParsedDefaultableProperty
