import {
	$ark,
	BaseScope,
	hasArkKind,
	parseGeneric,
	type AliasDefEntry,
	type ArkScopeConfig,
	type BaseNode,
	type BaseRoot,
	type GenericArgResolutions,
	type GenericAst,
	type GenericParamAst,
	type GenericRoot,
	type NodeKind,
	type NodeParseOptions,
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
	isThunk,
	throwParseError,
	type Dict,
	type ErrorType,
	type Json,
	type anyOrNever,
	type array,
	type flattenListable,
	type inferred,
	type noSuggest,
	type nominal
} from "@ark/util"
import type { ArkAmbient, ArkSchemaRegistry } from "./config.ts"
import {
	parseGenericParams,
	type GenericDeclaration,
	type GenericParser,
	type ParameterString,
	type baseGenericConstraints,
	type parseValidGenericParams
} from "./generic.ts"
import type { Ark, type } from "./keywords/ark.ts"
import type {
	BoundModule,
	Module,
	Submodule,
	instantiateExport
} from "./module.ts"
import {
	parseObject,
	writeBadDefinitionTypeMessage,
	type inferDefinition,
	type validateDefinition
} from "./parser/definition.ts"
import type { DefAst, InferredAst } from "./parser/semantic/infer.ts"
import { DynamicState } from "./parser/string/reduce/dynamic.ts"
import type { ParsedDefault } from "./parser/string/shift/operator/default.ts"
import { writeUnexpectedCharacterMessage } from "./parser/string/shift/operator/operator.ts"
import { Scanner } from "./parser/string/shift/scanner.ts"
import {
	fullStringParse,
	type StringParseResult
} from "./parser/string/string.ts"
import {
	InternalTypeParser,
	type DeclarationParser,
	type DefinitionParser,
	type Type,
	type TypeParser
} from "./type.ts"

export type ScopeParser = <const def>(
	def: validateScope<def>,
	config?: ArkScopeConfig
) => Scope<inferScope<def>>

export type ModuleParser = <const def>(
	def: validateScope<def>,
	config?: ArkScopeConfig
) => inferScope<def> extends infer $ ?
	Module<{ [k in exportedNameOf<$>]: $[k] }>
:	never

export type validateScope<def> = {
	[k in keyof def]: k extends noSuggest ?
		// avoid trying to parse meta keys when spreading modules
		unknown
	: parseScopeKey<k, def>["params"] extends infer params ?
		params extends array<GenericParamAst> ?
			params["length"] extends 0 ?
				// not including Type here directly breaks some cyclic tests (last checked w/ TS 5.5).
				// if you are from the future with a better version of TS and can remove it
				// without breaking `pnpm typecheck`, go for it.
				def[k] extends Type.Any | PreparsedResolution ? def[k]
				: k extends PrivateDeclaration<infer name extends keyof def & string> ?
					ErrorType<writeDuplicateAliasError<name>>
				:	validateDefinition<def[k], bootstrapAliases<def>, {}>
			:	validateDefinition<
					def[k],
					bootstrapAliases<def>,
					baseGenericConstraints<params>
				>
		:	// if we get here, the params failed to parse- return the error
			params
	:	never
}

export type inferScope<def> = inferBootstrapped<bootstrapAliases<def>>

// TODO: this (https://github.com/arktypeio/arktype/issues/1081)
// this: Def<def>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type bindThis<def> = {}

/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = nominal<def, "unparsed">

/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
export type UnparsedScope = "$"

/** These are legal as values of a scope but not as definitions in other contexts */
type PreparsedResolution = PreparsedNodeResolution

type bootstrapAliases<def> = {
	[k in Exclude<keyof def, GenericDeclaration>]: def[k] extends (
		PreparsedResolution
	) ?
		def[k] extends { t: infer g extends GenericAst } ? g
		: def[k] extends Module<infer $> ? Submodule<$>
		: def[k]
	: def[k] extends (() => infer thunkReturn extends PreparsedResolution) ?
		thunkReturn extends { t: infer g extends GenericAst } ? g
		: thunkReturn extends Module<infer $> ? Submodule<$>
		: thunkReturn
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

export type resolve<
	reference extends keyof $ | keyof args,
	$,
	args
> = inferResolution<
	reference extends keyof args ? args[reference] : $[reference & keyof $],
	$,
	args
>

export type resolutionToAst<alias extends string, resolution> =
	[resolution] extends [anyOrNever] ? InferredAst<resolution, alias>
	: resolution extends Def<infer def> ? DefAst<def, alias>
	: resolution extends { [arkKind]: "module"; $root: infer root } ?
		InferredAst<root, alias>
	: resolution extends GenericAst ? resolution
	: InferredAst<resolution, alias>

export type inferResolution<resolution, $, args> =
	[resolution] extends [anyOrNever] ? resolution
	: resolution extends { [inferred]: infer t } ? t
	: resolution extends Def<infer def> ? inferDefinition<def, $, args>
	: resolution

export type moduleKeyOf<$> = {
	[k in keyof $]: $[k] extends { [arkKind]: "module" } ?
		[$[k]] extends [anyOrNever] ?
			never
		:	k & string
	:	never
}[keyof $]

type unwrapPreinferred<t> = t extends type.cast<infer inferred> ? inferred : t

export type tryInferSubmoduleReference<$, token> =
	token extends `${infer submodule extends moduleKeyOf<$>}.${infer subalias}` ?
		subalias extends keyof $[submodule] ?
			unwrapPreinferred<$[submodule][subalias]>
		:	tryInferSubmoduleReference<$[submodule], subalias>
	: token extends (
		`${infer submodule extends moduleKeyOf<ArkAmbient.$>}.${infer subalias}`
	) ?
		subalias extends keyof ArkAmbient.$[submodule] ?
			unwrapPreinferred<ArkAmbient.$[submodule][subalias]>
		:	tryInferSubmoduleReference<ArkAmbient.$[submodule], subalias>
	:	never

export interface ArkTypeRegistry extends ArkSchemaRegistry {
	typeAttachments?: Ark.boundTypeAttachments<any>
}

export const $arkTypeRegistry: ArkTypeRegistry = $ark

export interface ParseContext extends TypeParseOptions {
	$: InternalScope
}

export interface TypeParseOptions {
	args?: GenericArgResolutions
}

export interface InternalScope {
	constructor: typeof InternalScope
}

export class InternalScope<$ extends {} = {}> extends BaseScope<$> {
	private parseCache: Record<string, StringParseResult> = {}

	override preparseAlias(k: string, v: unknown): AliasDefEntry {
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
				const params = parseGenericParams(paramString, {
					$: this as never,
					args: {}
				})

				const generic = parseGeneric(params, v, this as never)

				return generic
			}
		]
	}

	protected cacheGetter<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		Object.defineProperty(this, name, { value })
		return value
	}

	override preparseRoot(def: unknown): unknown {
		if (isThunk(def) && !hasArkKind(def, "generic")) return def()

		return def
	}

	get ambientAttachments(): Ark.boundTypeAttachments<$> | undefined {
		if (!$arkTypeRegistry.typeAttachments) return
		return this.cacheGetter(
			"ambientAttachments",
			flatMorph($arkTypeRegistry.typeAttachments, (k, v) => [
				k,
				(v as {} as BaseRoot | GenericRoot).bindScope(this)
			]) as never
		)
	}

	parse<defaultable extends boolean = false>(
		def: unknown,
		ctx: ParseContext,
		defaultable: defaultable = false as defaultable
	): BaseRoot | (defaultable extends false ? never : ParsedDefault) {
		if (typeof def === "string") {
			if (ctx.args && Object.keys(ctx.args).some(k => def.includes(k))) {
				// we can only rely on the cache if there are no contextual
				// resolutions like "this" or generic args
				return this.parseString(def, ctx, defaultable)
			}
			const contextKey = `${def}${defaultable}`
			return (this.parseCache[contextKey] ??= this.parseString(
				def,
				ctx,
				defaultable
			)) as never
		}
		return hasDomain(def, "object") ?
				parseObject(def, ctx)
			:	throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
	}

	parseString<defaultable extends boolean>(
		def: string,
		ctx: ParseContext,
		defaultable: defaultable
	): BaseRoot | (defaultable extends false ? never : ParsedDefault) {
		const aliasResolution = this.maybeResolveRoot(def)
		if (aliasResolution) return aliasResolution

		const aliasArrayResolution =
			def.endsWith("[]") ?
				this.maybeResolveRoot(def.slice(0, -2))?.array()
			:	undefined

		if (aliasArrayResolution) return aliasArrayResolution

		const s = new DynamicState(new Scanner(def), ctx, defaultable)

		const node = fullStringParse(s)

		if (s.finalizer === ">")
			throwParseError(writeUnexpectedCharacterMessage(">"))

		return node as never
	}

	parseRoot = (def: unknown, opts: TypeParseOptions = {}): BaseRoot => {
		const node: BaseRoot = this.parse(
			def,
			Object.assign(
				this.finalizeRootArgs(opts, () => node),
				{ $: this as never }
			)
		).bindScope(this as never)
		return node
	}

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

export const scope: ScopeParser = InternalScope.scope
export const module: ModuleParser = InternalScope.module

export interface Scope<$ = {}> {
	t: $
	[arkKind]: "scope"
	config: ArkScopeConfig
	references: readonly BaseNode[]
	json: Json
	exportedNames: array<exportedNameOf<$>>

	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	aliases: Record<string, unknown>
	internal: toInternalScope<$>

	defineSchema<const def extends RootSchema>(schema: def): def

	schema(schema: RootSchema, opts?: NodeParseOptions): BaseRoot

	node<kinds extends NodeKind | array<RootKind>>(
		kinds: kinds,
		schema: NodeSchema<flattenListable<kinds>>,
		opts?: NodeParseOptions
	): nodeOfKind<reducibleKindOf<flattenListable<kinds>>>

	type: TypeParser<$>

	declare: DeclarationParser<$>

	define: DefinitionParser<$>

	generic: GenericParser<$>

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

export const writeShallowCycleErrorMessage = (
	name: string,
	seen: string[]
): string =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(":")}`

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
