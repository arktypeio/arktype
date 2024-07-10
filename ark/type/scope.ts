import {
	GenericRoot,
	RawRootScope,
	hasArkKind,
	type ArkConfig,
	type BaseRoot,
	type GenericProps,
	type NodeParseOptions,
	type PreparsedNodeResolution,
	type PrivateDeclaration,
	type RawRootResolutions,
	type RootScope,
	type UnknownRoot,
	type arkKind,
	type destructuredExportContext,
	type destructuredImportContext,
	type exportedNameOf,
	type writeDuplicateAliasError
} from "@arktype/schema"
import {
	bound,
	domainOf,
	hasDomain,
	isThunk,
	throwParseError,
	type Dict,
	type anyOrNever,
	type keyError,
	type nominal,
	type show
} from "@arktype/util"
import type { Generic } from "./generic.js"
import { createMatchParser, type MatchParser } from "./match.js"
import type { Module } from "./module.js"
import {
	parseObject,
	writeBadDefinitionTypeMessage,
	type inferDefinition,
	type validateDefinition
} from "./parser/definition.js"
import {
	parseGenericParams,
	type GenericDeclaration,
	type GenericParamsParseError
} from "./parser/generic.js"
import { DynamicState } from "./parser/string/reduce/dynamic.js"
import type { ParsedDefault } from "./parser/string/shift/operator/default.js"
import {
	fullStringParse,
	type StringParseResult
} from "./parser/string/string.js"
import {
	RawTypeParser,
	type DeclarationParser,
	type DefinitionParser,
	type Type,
	type TypeParser
} from "./type.js"

export type ScopeParser = <const def>(
	def: validateScope<def>,
	config?: ArkConfig
) => Scope<inferScope<def>>

export type validateScope<def> = {
	[k in keyof def]: k extends symbol ?
		// this should only occur when importing/exporting modules, and those
		// keys should be ignored
		unknown
	: parseScopeKey<k>["params"] extends [] ?
		// not including Type here directly breaks some cyclic tests (last checked w/ TS 5.5).
		// if you are from the future with a better version of TS and can remove it
		// without breaking `pnpm typecheck`, go for it.
		def[k] extends Type | PreparsedResolution ? def[k]
		: k extends PrivateDeclaration<infer name extends keyof def & string> ?
			keyError<writeDuplicateAliasError<name>>
		:	validateDefinition<def[k], bootstrapAliases<def>, {}>
	: parseScopeKey<k>["params"] extends GenericParamsParseError ?
		// use the full nominal type here to avoid an overlap between the
		// error message and a possible value for the property
		parseScopeKey<k>["params"][0]
	:	validateDefinition<
			def[k],
			bootstrapAliases<def>,
			{
				// once we support constraints on generic parameters, we'd use
				// the base type here: https://github.com/arktypeio/arktype/issues/796
				[param in parseScopeKey<k>["params"][number]]: unknown
			}
		>
}

export type inferScope<def> = inferBootstrapped<bootstrapAliases<def>>

export type bindThis<def> = { this: Def<def> }

/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = nominal<def, "unparsed">

/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
export type UnparsedScope = "$"

/** These are legal as values of a scope but not as definitions in other contexts */
type PreparsedResolution = PreparsedNodeResolution

type bootstrapAliases<def> = {
	[k in Exclude<
		keyof def,
		// avoid inferring nominal symbols, e.g. arkKind from Module
		GenericDeclaration | symbol
	>]: def[k] extends PreparsedResolution ? def[k]
	: def[k] extends (() => infer thunkReturn extends PreparsedResolution) ?
		thunkReturn
	:	Def<def[k]>
} & {
	[k in keyof def & GenericDeclaration as extractGenericName<k>]: GenericProps<
		parseGenericParams<extractGenericParameters<k>>,
		def[k],
		UnparsedScope
	>
}

type inferBootstrapped<$> = show<{
	[name in keyof $]: $[name] extends Def<infer def> ?
		inferDefinition<def, $, {}>
	: $[name] extends GenericProps<infer params, infer def> ?
		// add the scope in which the generic was defined here
		Generic<params, def, $>
	:	// otherwise should be a submodule
		$[name]
}>

type extractGenericName<k> =
	k extends GenericDeclaration<infer name> ? name : never

type extractGenericParameters<k> =
	k extends GenericDeclaration<string, infer params> ? params : never

export type resolve<reference extends keyof $ | keyof args, $, args> =
	(
		reference extends keyof args ?
			args[reference]
		:	$[reference & keyof $]
	) extends infer resolution ?
		[resolution] extends [anyOrNever] ? resolution
		: resolution extends Def<infer def> ? inferDefinition<def, $, args>
		: resolution
	:	never

export type moduleKeyOf<$> = {
	// TODO: check against module directly?
	[k in keyof $]: $[k] extends { [arkKind]: "module" } ? k & string : never
}[keyof $]

export type tryInferSubmoduleReference<$, token> =
	token extends `${infer submodule extends moduleKeyOf<$>}.${infer subalias}` ?
		subalias extends keyof $[submodule] ?
			$[submodule][subalias]
		:	never
	: token extends `${infer submodule}.${infer subalias}` ?
		submodule extends moduleKeyOf<ArkEnv.$> ?
			subalias extends keyof ArkEnv.$[submodule] ?
				ArkEnv.$[submodule][subalias]
			:	never
		:	never
	:	never

export interface ParseContext extends TypeParseOptions {
	$: RawScope
}

export interface TypeParseOptions {
	args?: Record<string, UnknownRoot>
}

export const scope: ScopeParser = ((def: Dict, config: ArkConfig = {}) =>
	new RawScope(def, config)) as never

export interface Scope<$ = any> extends RootScope<$> {
	type: TypeParser<$>

	match: MatchParser<$>

	declare: DeclarationParser<$>

	define: DefinitionParser<$>

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): Module<show<destructuredImportContext<$, names>>>

	export<names extends exportedNameOf<$>[]>(
		...names: names
	): Module<show<destructuredExportContext<$, names>>>
}

export class RawScope<
	$ extends RawRootResolutions = RawRootResolutions
> extends RawRootScope<$> {
	private parseCache: Record<string, StringParseResult> = {}

	constructor(def: Record<string, unknown>, config?: ArkConfig) {
		const aliases: Record<string, unknown> = {}
		for (const k in def) {
			const parsedKey = parseScopeKey(k)
			aliases[parsedKey.name] =
				parsedKey.params.length ?
					new GenericRoot(parsedKey.params, def[k], () => this as never)
				:	def[k]
		}
		super(aliases, config)
	}

	type: RawTypeParser = new RawTypeParser(this as never)

	match: MatchParser<$> = createMatchParser(this as never) as never

	declare: () => { type: RawTypeParser } = (() => ({
		type: this.type
	})).bind(this)

	define: (def: unknown) => unknown = ((def: unknown) => def).bind(this)

	override preparseRoot(def: unknown): unknown {
		if (isThunk(def) && !hasArkKind(def, "generic")) return def()

		return def
	}

	@bound
	override parseRoot(def: unknown, opts?: TypeParseOptions): BaseRoot {
		return this.parse(def, {
			...opts,
			$: this as never
		}).bindScope(this)
	}

	parse<defaultable extends boolean = false>(
		def: unknown,
		ctx: ParseContext,
		defaultable: defaultable = false as defaultable
	): BaseRoot | (defaultable extends false ? never : ParsedDefault) {
		if (typeof def === "string") {
			if (ctx.args && Object.keys(ctx.args).every(k => !def.includes(k))) {
				// we can only rely on the cache if there are no contextual
				// resolutions like "this" or generic args
				return this.parseString(def, ctx, defaultable)
			}
			const contextKey = `${def}${defaultable}`
			if (!this.parseCache[contextKey])
				this.parseCache[contextKey] = this.parseString(def, ctx, defaultable)

			return this.parseCache[contextKey] as never
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

		return fullStringParse(new DynamicState(def, ctx, defaultable)) as never
	}
}

export const writeShallowCycleErrorMessage = (
	name: string,
	seen: string[]
): string =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(":")}`

export type ParsedScopeKey = {
	name: string
	params: string[]
}

export const parseScopeKey = (k: string): ParsedScopeKey => {
	const firstParamIndex = k.indexOf("<")
	if (firstParamIndex === -1) {
		return {
			name: k,
			params: []
		}
	}
	if (k.at(-1) !== ">") {
		throwParseError(
			`'>' must be the last character of a generic declaration in a scope`
		)
	}
	return {
		name: k.slice(0, firstParamIndex),
		params: parseGenericParams(k.slice(firstParamIndex + 1, -1))
	}
}

export type parseScopeKey<k> =
	k extends GenericDeclaration<infer name, infer paramString> ?
		{
			name: name
			params: parseGenericParams<paramString>
		}
	:	{
			name: k
			params: []
		}
