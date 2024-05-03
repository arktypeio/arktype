import {
	type ArkConfig,
	type BaseRoot,
	type GenericProps,
	type PreparsedNodeResolution,
	type PrivateDeclaration,
	type RawRootResolutions,
	RawRootScope,
	type RootScope,
	type UnknownRoot,
	type ambient,
	type arkKind,
	type destructuredExportContext,
	type destructuredImportContext,
	type exportedNameOf,
	hasArkKind,
	type writeDuplicateAliasError
} from "@arktype/schema"
import {
	type Dict,
	type anyOrNever,
	domainOf,
	hasDomain,
	isThunk,
	type keyError,
	type nominal,
	type show,
	throwParseError
} from "@arktype/util"
import type { type } from "./ark.js"
import { Generic } from "./generic.js"
import { type MatchParser, createMatchParser } from "./match.js"
import type { Module } from "./module.js"
import {
	type inferDefinition,
	parseObject,
	type validateDefinition,
	writeBadDefinitionTypeMessage
} from "./parser/definition.js"
import {
	type GenericDeclaration,
	type GenericParamsParseError,
	parseGenericParams
} from "./parser/generic.js"
import { DynamicState } from "./parser/string/reduce/dynamic.js"
import { fullStringParse } from "./parser/string/string.js"
import {
	type DeclarationParser,
	type DefinitionParser,
	RawTypeParser,
	type Type,
	type TypeParser
} from "./type.js"

export type ScopeParser = <const def>(
	def: validateScope<def>,
	config?: ArkConfig
) => Scope<inferBootstrapped<bootstrapAliases<def>>>

type validateScope<def> = {
	[k in keyof def]: k extends symbol ?
		// this should only occur when importing/exporting modules, and those
		// keys should be ignored
		unknown
	: parseScopeKey<k>["params"] extends [] ?
		// Not including Type here directly breaks inference
		def[k] extends Type | PreparsedResolution ? def[k]
		: k extends PrivateDeclaration<infer name extends keyof def & string> ?
			keyError<writeDuplicateAliasError<name>>
		:	validateDefinition<def[k], ambient & bootstrapAliases<def>, {}>
	: parseScopeKey<k>["params"] extends GenericParamsParseError ?
		// use the full nominal type here to avoid an overlap between the
		// error message and a possible value for the property
		parseScopeKey<k>["params"][0]
	:	validateDefinition<
			def[k],
			ambient & bootstrapAliases<def>,
			{
				// once we support constraints on generic parameters, we'd use
				// the base type here: https://github.com/arktypeio/arktype/issues/796
				[param in parseScopeKey<k>["params"][number]]: unknown
			}
		>
}

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
		inferDefinition<def, $ & ambient, {}>
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
			$[submodule][subalias] extends type.cast<infer t> ?
				t
			:	never
		:	never
	:	never

export interface ParseContext {
	$: RawScope
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
	private parseCache: Record<string, BaseRoot> = {}

	constructor(def: Record<string, unknown>, config?: ArkConfig) {
		const aliases: Record<string, unknown> = {}
		for (const k in def) {
			const parsedKey = parseScopeKey(k)
			aliases[parsedKey.name] =
				parsedKey.params.length ?
					// TODO: this
					new Generic(parsedKey.params, def[k], {} as never)
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

	override parseRoot(def: unknown): BaseRoot {
		// args: { this: {} as RawRoot },
		return this.parse(def, {
			$: this as never,
			args: {}
			// type parsing can bypass nodes if it hits the cache,
			// so bind it directly (could be optimized)
		}).bindScope(this)
	}

	parse(def: unknown, ctx: ParseContext): BaseRoot {
		if (typeof def === "string") {
			if (ctx.args && Object.keys(ctx.args).every(k => !def.includes(k))) {
				// we can only rely on the cache if there are no contextual
				// resolutions like "this" or generic args
				return this.parseString(def, ctx)
			}
			if (!this.parseCache[def])
				this.parseCache[def] = this.parseString(def, ctx)

			return this.parseCache[def]
		}
		return hasDomain(def, "object") ?
				parseObject(def, ctx)
			:	throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
	}

	parseString(def: string, ctx: ParseContext): BaseRoot {
		return (
			this.maybeResolveRoot(def) ??
			((def.endsWith("[]") &&
				this.maybeResolveRoot(def.slice(0, -2))?.array()) ||
				fullStringParse(new DynamicState(def, ctx)))
		)
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
