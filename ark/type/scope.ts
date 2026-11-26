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
	type writeShallowCycleErrorMessage,
	isFinalResolution
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
	type Fn,
	type JsonStructure,
	type Primitive,
	type anyOrNever,
	type array,
	type inferred,
	type noSuggest
} from "@ark/util"
import { setEngine } from "arksets/internal"
import type { InferredMorph } from "./attributes.ts"
import type { AmbientKey } from "./config.ts"
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
import type { Ark } from "./keywords/keywords.ts"
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
	type inferDefinition,
	type validateDefinition
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
	type Type,
	type TypeParser,
	type UnitTypeParser,
	type ValueOfTypeParser
} from "./type.ts"

// a bundler trusting sideEffects drops a bare import
if (setEngine.registry !== undefined && setEngine.registry !== $ark) {
	throwParseError(
		"The set engine was loaded from a different copy of @ark/schema than arktype. Deduplicate your arktype install."
	)
}
$ark.sets ??= setEngine

/** The convenience properties attached to `scope` */
export type ScopeParserAttachments =
	// map over to remove call signatures
	Omit<ScopeParser, never>

export type AmbientEntry =
	| Type<any, any>
	| Generic<any, any, any, any>
	| Module<any>
	| BoundModule<any, any>

export type AmbientInput =
	| Module<any>
	| BoundModule<any, any>
	| { readonly [k: string]: AmbientEntry | "module" }

type InvalidAmbientMessage =
	"ambient must be a Module or a record of Types, Generics, or Modules"

type writeInvalidAmbientEntryMessage<k extends string> =
	`ambient.${k} must be a Type, Generic, or Module`

type validateAmbientEntry<k, v> =
	[v] extends [anyOrNever] ? v
	: v extends InferredDefinition | { [arkKind]: "generic"; t: GenericAst } ? v
	: v extends Module<infer exports> | BoundModule<infer exports, any> ?
		Exclude<keyof v, arkKind> extends keyof exports ?
			v
		:	ErrorMessage<writeInvalidAmbientEntryMessage<k & string>>
	:	ErrorMessage<writeInvalidAmbientEntryMessage<k & string>>

type validateAmbientRecord<ambient> = {
	[k in keyof ambient]: k extends arkKind ? unknown
	:	validateAmbientEntry<k, ambient[k]>
}

type hasCustomAmbient<ambient> =
	[ambient] extends [undefined] ? false
	: [ambient] extends [anyOrNever] ? true
	: unknown extends ambient ? false
	: true

type validateAmbient<ambient> =
	[ambient] extends [undefined] ? unknown
	: [ambient] extends [anyOrNever] ? ambient
	: unknown extends ambient ? ambient
	: ambient extends Module<infer exports> | BoundModule<infer exports, any> ?
		Exclude<keyof ambient, arkKind> extends keyof exports ?
			ambient
		:	validateAmbientRecord<ambient>
	: ambient extends Primitive | Fn | readonly unknown[] ?
		ErrorMessage<InvalidAmbientMessage>
	:	validateAmbientRecord<ambient>

type normalizeAmbientEntry<v> =
	[v] extends [anyOrNever] ? v
	: v extends { t: infer g extends GenericAst } ? g
	: v extends Module<infer exports> | BoundModule<infer exports, any> ?
		Exclude<keyof v, arkKind> extends keyof exports ?
			Submodule<exports>
		:	never
	: v extends { [inferred]: infer t } ? t
	: never

type normalizeAmbientRecord<ambient> = {
	[k in Exclude<keyof ambient, arkKind>]: normalizeAmbientEntry<ambient[k]>
} & unknown

type normalizeAmbient<ambient> =
	[ambient] extends [anyOrNever] ? ambient
	: ambient extends Module<infer exports> | BoundModule<infer exports, any> ?
		Exclude<keyof ambient, arkKind> extends keyof exports ?
			exports
		:	normalizeAmbientRecord<ambient>
	: ambient extends Primitive | Fn | readonly unknown[] ? {}
	: normalizeAmbientRecord<ambient>

type withAmbient<$, ambient> =
	hasCustomAmbient<ambient> extends true ?
		$ & { readonly [k in AmbientKey]: normalizeAmbient<ambient> }
	:	$

type exportedModuleOf<$> =
	[$] extends [{ readonly [k in AmbientKey]: unknown }] ?
		BoundModule<{ [k in exportedNameOf<$>]: $[k] }, $>
	:	Module<{ [k in exportedNameOf<$>]: $[k] }>

type importedModuleOf<$> =
	[$] extends [{ readonly [k in AmbientKey]: unknown }] ?
		BoundModule<{ [k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k] }, $>
	:	Module<{ [k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k] }>

interface AmbientArgument<in out ambient> {
	validated: validateAmbient<ambient>
}

type validateAmbientArgument<ambient> =
	[ambient] extends [unknown] ?
		AmbientArgument<ambient>[ambient extends unknown ? "validated" : never]
	:	ambient

export interface ArkScopeConfig<ambient = AmbientInput>
	extends Omit<ArkSchemaScopeConfig, "ambient"> {
	ambient?: validateAmbientArgument<ambient> | undefined
}

export interface ScopeParser {
	<const def, const ambient>(
		def: scope.validate<def, ambient>,
		config?: ArkScopeConfig<ambient>
	): Scope<scope.infer<def, ambient>>

	define: <const def>(def: scope.validate<def>) => def
}

export type ModuleParser = <const def, const ambient>(
	def: scope.validate<def, ambient>,
	config?: ArkScopeConfig<ambient>
) => scope.infer<def, ambient> extends infer $ ? exportedModuleOf<$> : never

export type bindThis<def> = { this: Def<def> }

/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = Brand<def, "unparsed">

/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
export type UnparsedScope = "$"

/** These are legal as values of a scope but not as definitions in other contexts */
type PreparsedResolution = PreparsedNodeResolution

type bootstrapAliases<def, ambient = unknown> = withAmbient<
	{
		[k in Exclude<keyof def, GenericDeclaration | noSuggest>]: def[k] extends (
			PreparsedResolution
		) ?
			def[k] extends { t: infer g extends GenericAst } ? g
			: def[k] extends Module<infer $> | BoundModule<infer $, any> ?
				Submodule<$>
			:	def[k]
		: def[k] extends (() => infer thunkReturn extends PreparsedResolution) ?
			thunkReturn extends { t: infer g extends GenericAst } ? g
			: thunkReturn extends Module<infer $> | BoundModule<infer $, any> ?
				Submodule<$>
			:	thunkReturn
		:	Def<def[k]>
	} & {
		[k in keyof def & GenericDeclaration as extractGenericName<k>]: GenericAst<
			parseValidGenericParams<
				extractGenericParameters<k>,
				bootstrapAliases<def, ambient>
			>,
			def[k],
			UnparsedScope
		>
	},
	ambient
>

type inferBootstrapped<$> = {
	[name in keyof $]: name extends AmbientKey ? $[name]
	: $[name] extends Def<infer def> ? inferDefinition<def, $, {}>
	: // written out rather than through an alias so declarations emitted for a
	// scope's generics name only GenericAst, which arktype exports
	$[name] extends { t: infer g extends GenericAst } ?
		GenericAst<
			g["paramsAst"],
			g["bodyDef"],
			g["$"] extends UnparsedScope ? $ : g["$"],
			$
		>
	:	// should be submodule
		$[name]
} & unknown

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
		if (
			!$arkTypeRegistry.typeAttachments ||
			this.scopeConfig?.ambient !== undefined
		)
			return
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

			const configured = (def: unknown) => {
				const config = this.keywordConfigOf(qualifiedName)
				return config ? ([def, "@", config] satisfies TupleExpression) : def
			}

			if (!isThunk(def)) return [alias, configured(def)]
			// a thunk reads its config when called, so ark doesn't fix it
			return [
				alias,
				() => {
					const resolution = def()
					if (hasArkKind(resolution, "generic")) return resolution
					return configured(resolution)
				}
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
		new InternalScope(def, config as never)) as never

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
		(exports ??= new InternalScope(def, config as never, true).exportLazily())[
			name as never
		]
	for (const name in def)
		if (name[0] !== "#") defineLazily(module, name, resolve, isFinalResolution)
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
	export type validate<def, ambient = unknown> = {
		[k in keyof def]: k extends noSuggest ?
			// avoid trying to parse meta keys when spreading modules
			unknown
		: parseScopeKey<k, def, ambient>["params"] extends infer params ?
			params extends array<GenericParamAst> ?
				params["length"] extends 0 ?
					// checking against Type reads ArkEnv.meta, which a meta inferred from a
					// scope importing Types references (#1644)
					def[k] extends InferredDefinition | PreparsedResolution ? def[k]
					: k extends (
						PrivateDeclaration<infer name extends keyof def & string>
					) ?
						ErrorType<writeDuplicateAliasError<name>>
					:	validateAlias<k, def[k], bootstrapAliases<def, ambient>>
				: def[k] extends Generic ?
					ErrorType<
						writeParameterizedGenericKeyMessage<
							parseScopeKey<k, def, ambient>["name"] & string
						>
					>
				:	validateDefinition<
						def[k],
						bootstrapAliases<def, ambient>,
						baseGenericConstraints<params>
					>
			:	// if we get here, the params failed to parse- return the error
				params
		:	never
	}

	export type infer<def, ambient = unknown> = inferBootstrapped<
		bootstrapAliases<def, ambient>
	>
}

// an alias is a property of scope's parameter, not a parameter itself, so it
// doesn't need type.validate, which costs 13 more instantiations
type validateAlias<k, def, $> =
	shallowCycleMessageOf<k, def, $> extends infer message extends string ?
		ErrorMessage<message>
	:	validateDefinition<def, $, {}>

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

	import(): importedModuleOf<$>
	import<names extends exportedNameOf<$>[]>(
		...names: names
	): BoundModule<
		{
			[k in names[number] as PrivateDeclaration<k>]: $[k]
		} & unknown,
		$
	>

	export(): exportedModuleOf<$>
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

export type parseScopeKey<k, def, ambient = unknown> =
	// trying to infer against GenericDeclaration here directly also fails as of TS 5.5
	k extends `${infer name}<${infer params}>` ?
		parseGenericScopeKey<name, params, def, ambient>
	:	{
			name: k
			params: []
		}

type parseGenericScopeKey<
	name extends string,
	params extends string,
	def,
	ambient = unknown
> = {
	name: name
	params: parseGenericParams<params, bootstrapAliases<def, ambient>>
}

export type InnerParseResult =
	| BaseRoot
	| ParsedOptionalProperty
	| ParsedDefaultableProperty
