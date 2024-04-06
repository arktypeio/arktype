import {
	type ArkConfig,
	type GenericProps,
	type NodeParseOptions,
	type Schema,
	SchemaScope,
	type ambient,
	arkKind,
	type destructuredExportContext,
	type destructuredImportContext,
	type exportedNameOf,
	hasArkKind
} from "@arktype/schema"
import {
	type Dict,
	DynamicBase,
	type Hkt,
	type conform,
	domainOf,
	type evaluate,
	flatMorph,
	hasDomain,
	type nominal,
	throwParseError
} from "@arktype/util"
import type { type } from "./ark.js"
import { Generic } from "./generic.js"
import { type MatchParser, createMatchParser } from "./match.js"
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
	Type,
	type TypeParser,
	createTypeParser
} from "./type.js"

export type ScopeParser = <const def>(
	def: validateScope<def>,
	config?: ArkConfig
) => Scope<inferBootstrapped<bootstrapAliases<def>>>

type validateScope<def> = {
	[k in keyof def]: parseScopeKey<k>["params"] extends []
		? // Not including Type here directly breaks inference
			def[k] extends Type | PreparsedResolution
			? def[k]
			: validateDefinition<def[k], bootstrapAliases<def>, {}>
		: parseScopeKey<k>["params"] extends GenericParamsParseError
			? // use the full nominal type here to avoid an overlap between the
				// error message and a possible value for the property
				parseScopeKey<k>["params"][0]
			: validateDefinition<
					def[k],
					bootstrapAliases<def>,
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
type PreparsedResolution = Module | GenericProps

type bootstrapAliases<def> = {
	[k in Exclude<
		keyof def,
		// avoid inferring nominal symbols, e.g. arkKind from Module
		GenericDeclaration | symbol
	>]: def[k] extends PreparsedResolution
		? def[k]
		: def[k] extends (() => infer thunkReturn extends PreparsedResolution)
			? thunkReturn
			: Def<def[k]>
} & {
	[k in keyof def & GenericDeclaration as extractGenericName<k>]: Generic<
		parseGenericParams<extractGenericParameters<k>>,
		def[k],
		UnparsedScope
	>
}

type inferBootstrapped<$> = evaluate<{
	[name in keyof $]: $[name] extends Def<infer def>
		? inferDefinition<def, $, {}>
		: $[name] extends GenericProps<infer params, infer def>
			? // add the scope in which the generic was defined here
				Generic<params, def, $>
			: // otherwise should be a submodule
				$[name]
}>

type extractGenericName<k> = k extends GenericDeclaration<infer name>
	? name
	: never

type extractGenericParameters<k> = k extends GenericDeclaration<
	string,
	infer params
>
	? params
	: never

export type resolve<reference extends keyof $ | keyof args, $, args> = (
	reference extends keyof args
		? args[reference]
		: $[reference & keyof $]
) extends infer resolution
	? resolution extends Def<infer def>
		? def extends null
			? // handle resolution of any and never
				resolution
			: inferDefinition<def, $, args>
		: resolution
	: never

export type moduleKeyOf<$> = {
	[k in keyof $]: $[k] extends Module ? k & string : never
}[keyof $]

export type tryInferSubmoduleReference<$, token> =
	token extends `${infer submodule extends moduleKeyOf<$>}.${infer subalias}`
		? subalias extends keyof $[submodule]
			? $[submodule][subalias] extends Type<infer t>
				? t
				: never
			: never
		: never

export class Module<$ = any> extends DynamicBase<exportScope<$>> {
	private readonly [arkKind] = "module"
}

type exportScope<$ = any> = {
	[k in exportedNameOf<$>]: $[k] extends PreparsedResolution
		? [$[k]] extends [null]
			? // handle `Type<any>` and `Type<never>`
				Type<$[k], $>
			: $[k]
		: Type<$[k], $>
}

export interface ParseContext extends NodeParseOptions {
	$: Scope
}

type MergedResolutions = Record<string, Schema | Generic>

declare global {
	export interface ArkRegistry {
		ambient: Scope<ambient>
	}
}

export const scope: ScopeParser = ((def: Dict, config: ArkConfig = {}) =>
	new Scope(def, config)) as never

interface TypeWrap extends Hkt.Kind {
	f: (
		args: conform<this[Hkt.key], readonly [t: unknown, $: unknown]>
	) => Type<(typeof args)[0], (typeof args)[1]>
}

export class Scope<$ = any> extends SchemaScope<$, TypeWrap> {
	private parseCache: Record<string, Schema> = {}

	constructor(def: Record<string, unknown>, config?: ArkConfig) {
		const aliases: Record<string, unknown> = {}
		for (const k in def) {
			const parsedKey = parseScopeKey(k)
			aliases[parsedKey.name] = parsedKey.params.length
				? new Generic(parsedKey.params, def[k], this)
				: def[k]
		}
		super(aliases, config)
	}

	type: TypeParser<$> = createTypeParser(this as never) as never

	match: MatchParser<$> = createMatchParser(this as never) as never

	declare: DeclarationParser<$> = () => ({ type: this.type }) as never

	define: DefinitionParser<$> = (def) => def as never

	// TODO: name?
	get<name extends exportedNameOf<$>>(name: name): Type<$[name], $> {
		return this.export()[name] as never
	}

	parse(def: unknown, ctx: ParseContext): Schema {
		if (typeof def === "string") {
			if (
				ctx.args &&
				Object.keys(ctx.args).every((k) => !def.includes(k))
			) {
				// we can only rely on the cache if there are no contextual
				// resolutions like "this" or generic args
				return this.parseString(def, ctx)
			}
			if (!this.parseCache[def]) {
				this.parseCache[def] = this.parseString(def, ctx)
			}
			return this.parseCache[def]
		}
		return hasDomain(def, "object")
			? parseObject(def, ctx)
			: throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
	}

	parseTypeRoot(def: unknown, opts?: NodeParseOptions): Type {
		return new Type(
			this.parse(def, {
				args: { this: {} as Schema },
				$: this,
				...opts
			}),
			this
		)
	}

	parseString(def: string, ctx: ParseContext): Schema {
		return (
			this.maybeResolveNode(def) ??
			((def.endsWith("[]") &&
				this.maybeResolveNode(def.slice(0, -2))?.array()) ||
				fullStringParse(new DynamicState(def, ctx)))
		)
	}

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): destructuredImportContext<
		$,
		names extends [] ? exportedNameOf<$> : names[number]
	> {
		return super.import(...names) as never
	}

	export<names extends exportedNameOf<$>[]>(
		...names: names
	): Module<
		names extends [] ? $ : destructuredExportContext<$, names[number]>
	> {
		return super.export(...names) as never
	}
}

export const writeShallowCycleErrorMessage = (
	name: string,
	seen: string[]
): string =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
		":"
	)}`

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

export type parseScopeKey<k> = k extends GenericDeclaration<
	infer name,
	infer paramString
>
	? {
			name: name
			params: parseGenericParams<paramString>
		}
	: {
			name: k
			params: []
		}
