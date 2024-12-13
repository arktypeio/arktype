import {
	$ark,
	BaseScope,
	hasArkKind,
	parseGeneric,
	type AliasDefEntry,
	type ArkScopeConfig,
	type BaseNode,
	type BaseParseContext,
	type BaseParseContextInput,
	type BaseParseOptions,
	type BaseRoot,
	type GenericAst,
	type GenericParamAst,
	type GenericParamDef,
	type GenericRoot,
	type NodeKind,
	type NodeSchema,
	type PreparsedNodeResolution,
	type PrivateDeclaration,
	type RootKind,
	type RootSchema,
	type arkKind,
	type exportedNameOf,
	type nodeOfKind,
	type reducibleKindOf,
	type toInternalScope,
	type writeDuplicateAliasError
} from "@ark/schema"
import {
	domainOf,
	flatMorph,
	hasDomain,
	isArray,
	isThunk,
	throwParseError,
	type Brand,
	type Dict,
	type ErrorType,
	type JsonStructure,
	type anyOrNever,
	type array,
	type flattenListable,
	type noSuggest
} from "@ark/util"
import type { ArkSchemaRegistry } from "./config.ts"
import {
	parseGenericParamName,
	type GenericDeclaration,
	type GenericParser,
	type ParameterString,
	type baseGenericConstraints,
	type parseGenericParams,
	type parseValidGenericParams
} from "./generic.ts"
import type { Ark, type } from "./keywords/keywords.ts"
import type {
	BoundModule,
	Module,
	Submodule,
	instantiateExport
} from "./module.ts"
import type { DefAst, InferredAst } from "./parser/ast/infer.ts"
import {
	shallowDefaultableMessage,
	shallowOptionalMessage
} from "./parser/ast/validate.ts"
import {
	parseObject,
	writeBadDefinitionTypeMessage,
	type inferDefinition
} from "./parser/definition.ts"
import type { ParsedOptionalProperty } from "./parser/property.ts"
import { DynamicState } from "./parser/reduce/dynamic.ts"
import type { ParsedDefaultableProperty } from "./parser/shift/operator/default.ts"
import { writeUnexpectedCharacterMessage } from "./parser/shift/operator/operator.ts"
import { ArkTypeScanner } from "./parser/shift/scanner.ts"
import { fullStringParse } from "./parser/string.ts"
import {
	InternalTypeParser,
	type DeclarationParser,
	type DefinitionParser,
	type EnumeratedTypeParser,
	type InstanceOfTypeParser,
	type SchemaParser,
	type TypeParser,
	type UnitTypeParser
} from "./type.ts"

/** The convenience properties attached to `scope` */
export type ScopeParserAttachments =
	// map over to remove call signatures
	Omit<ScopeParser, never>

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
}

export const $arkTypeRegistry: ArkTypeRegistry = $ark

export interface InternalScope {
	constructor: typeof InternalScope
}

export class InternalScope<$ extends {} = {}> extends BaseScope<$> {
	private parseCache: Record<string, InnerParseResult> = {}

	protected cacheGetter<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		Object.defineProperty(this, name, { value })
		return value
	}

	get ambientAttachments(): Ark.boundTypeAttachments<$> | undefined {
		if (!$arkTypeRegistry.typeAttachments) return
		return this.cacheGetter(
			"ambientAttachments",
			flatMorph($arkTypeRegistry.typeAttachments, (k, v) => [
				k,
				this.bindReference(v as {} as BaseRoot | GenericRoot)
			]) as never
		)
	}

	protected preparseOwnAliasEntry(k: string, v: unknown): AliasDefEntry {
		const firstParamIndex = k.indexOf("<")
		if (firstParamIndex === -1) return [k, v]

		if (k.at(-1) !== ">") {
			throwParseError(
				`'>' must be the last character of a generic declaration in a scope`
			)
		}

		const name = k.slice(0, firstParamIndex)
		const paramString = k.slice(firstParamIndex + 1, -1)

		return [
			name,
			// use a thunk definition for the generic so that we can parse
			// constraints within the current scope
			() => {
				const params = this.parseGenericParams(paramString, { alias: name })

				const generic = parseGeneric(params, v, this as never)

				return generic
			}
		]
	}

	parseGenericParams(
		def: string,
		opts: BaseParseOptions
	): array<GenericParamDef> {
		return parseGenericParamName(
			new ArkTypeScanner(def),
			[],
			this.createParseContext({ ...opts, def, prefix: "generic" })
		)
	}

	protected normalizeRootScopeValue(resolution: unknown): unknown {
		if (isThunk(resolution) && !hasArkKind(resolution, "generic"))
			return resolution()
		return resolution
	}

	protected preparseOwnDefinitionFormat(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput {
		return {
			...opts,
			def,
			prefix: opts.alias ?? "type"
		}
	}

	parseInnerDefinition(def: unknown, ctx: BaseParseContext): InnerParseResult {
		if (typeof def === "string") {
			if (ctx.args && Object.keys(ctx.args).some(k => def.includes(k))) {
				// we can only rely on the cache if there are no contextual
				// resolutions like "this" or generic args
				return this.parseString(def, ctx)
			}
			return (this.parseCache[def] ??= this.parseString(def, ctx))
		}
		return hasDomain(def, "object") ?
				parseObject(def, ctx)
			:	throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
	}

	parseOwnDefinitionFormat(def: unknown, ctx: BaseParseContext): BaseRoot {
		const isScopeAlias = ctx.alias && ctx.alias in this.aliases

		// if the definition being parsed is not a scope alias and is not a
		// generic instantiation (i.e. opts don't include args), add `this` as a resolution.

		// if we're parsing a nested string, ctx.args will have already been set
		if (!isScopeAlias && !ctx.args) ctx.args = { this: ctx.id }

		const result = this.parseInnerDefinition(def, ctx)

		if (isArray(result)) {
			if (result[1] === "=") return throwParseError(shallowDefaultableMessage)

			if (result[1] === "?") return throwParseError(shallowOptionalMessage)
		}

		return result
	}

	parseString(def: string, ctx: BaseParseContext): InnerParseResult {
		const aliasResolution = this.maybeResolveRoot(def)
		if (aliasResolution) return aliasResolution

		const aliasArrayResolution =
			def.endsWith("[]") ?
				this.maybeResolveRoot(def.slice(0, -2))?.array()
			:	undefined

		if (aliasArrayResolution) return aliasArrayResolution

		const s = new DynamicState(new ArkTypeScanner(def), ctx)

		const node = fullStringParse(s)

		if (s.finalizer === ">")
			throwParseError(writeUnexpectedCharacterMessage(">"))

		return node
	}

	unit: UnitTypeParser<$> = value => this.units([value]) as never

	enumerated: EnumeratedTypeParser<$> = (...values) =>
		this.units(values) as never

	instanceOf: InstanceOfTypeParser<$> = ctor =>
		this.node("proto", { proto: ctor }, { prereduced: true }) as never

	type: InternalTypeParser = new InternalTypeParser(this as never)

	declare = (): { type: InternalTypeParser } => ({
		type: this.type
	})

	define: (def: unknown) => unknown = ((def: unknown) => def).bind(this)

	static scope: ScopeParser = ((def: Dict, config: ArkScopeConfig = {}) =>
		new InternalScope(def, config)) as never

	static module: ModuleParser = ((def: Dict, config: ArkScopeConfig = {}) =>
		this.scope(def as never, config).export()) as never
}

export const scope: ScopeParser = Object.assign(InternalScope.scope, {
	define: def => def as never
} satisfies ScopeParserAttachments)

export declare namespace scope {
	export type validate<def> = {
		[k in keyof def]: k extends noSuggest ?
			// avoid trying to parse meta keys when spreading modules
			unknown
		: parseScopeKey<k, def>["params"] extends infer params ?
			params extends array<GenericParamAst> ?
				params["length"] extends 0 ?
					// not including Type here directly breaks some cyclic tests (last checked w/ TS 5.5).
					// if you are from the future with a better version of TS and can remove it
					// without breaking `pnpm typecheck`, go for it.
					def[k] extends type.Any | PreparsedResolution ? def[k]
					: k extends (
						PrivateDeclaration<infer name extends keyof def & string>
					) ?
						ErrorType<writeDuplicateAliasError<name>>
					:	type.validate<def[k], bootstrapAliases<def>, {}>
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

export const module: ModuleParser = InternalScope.module

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

	node<kinds extends NodeKind | array<RootKind>>(
		kinds: kinds,
		schema: NodeSchema<flattenListable<kinds>>,
		opts?: BaseParseOptions
	): nodeOfKind<reducibleKindOf<flattenListable<kinds>>>

	unit: UnitTypeParser<$>
	enumerated: EnumeratedTypeParser<$>

	type: TypeParser<$>

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
