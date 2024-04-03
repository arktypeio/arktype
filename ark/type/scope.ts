import {
	BaseScope,
	hasArkKind,
	type ambient,
	type ArkConfig,
	type arkKind,
	type exportedName,
	type TypeNode
} from "@arktype/schema"
import {
	domainOf,
	flatMorph,
	hasDomain,
	throwParseError,
	type Dict,
	type evaluate,
	type isAny,
	type nominal
} from "@arktype/util"
import type { type } from "./ark.js"
import { createMatchParser, type MatchParser } from "./match.js"
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
import { fullStringParse } from "./parser/string/string.js"
import {
	createTypeParser,
	generic,
	type DeclarationParser,
	type DefinitionParser,
	type Generic,
	type GenericProps,
	type Type,
	type TypeParser
} from "./type.js"

export type ScopeParser = {
	<const def>(
		def: validateScope<def>,
		config?: ArkConfig
	): Scope<inferBootstrapped<bootstrapAliases<def>>>
}

type validateScope<def> = {
	[k in keyof def]: parseScopeKey<k>["params"] extends []
		? // Not including Type here directly breaks inference
		  def[k] extends Type | PreparsedResolution
			? def[k]
			: validateDefinition<def[k], bootstrap<def>, {}>
		: parseScopeKey<k>["params"] extends GenericParamsParseError
		? // use the full nominal type here to avoid an overlap between the
		  // error message and a possible value for the property
		  parseScopeKey<k>["params"][0]
		: validateDefinition<
				def[k],
				bootstrap<def>,
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

type bootstrap<def> = bootstrapAliases<def>

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
	reference extends keyof args ? args[reference] : $[reference & keyof $]
) extends infer resolution
	? [resolution] extends [never]
		? never
		: isAny<resolution> extends true
		? any
		: resolution extends Def<infer def>
		? inferDefinition<def, $, args>
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

export type Module<$ = any> = {
	// just adding the nominal id this way and mapping it is cheaper than an intersection
	[k in exportedName<$> | arkKind]: k extends string
		? [$[k]] extends [never]
			? Type<never, $>
			: isAny<$[k]> extends true
			? Type<any, $>
			: $[k] extends PreparsedResolution
			? $[k]
			: Type<$[k], $>
		: // set the nominal symbol's value to something validation won't care about
		  // since the inferred type will be omitted anyways
		  type.cast<"module">
}

export type ParseContext = {
	baseName: string
	path: string[]
	$: Scope
	args: Record<string, TypeNode> | undefined
}

type MergedResolutions = Record<string, TypeNode | Generic>

type ParseContextInput = Partial<ParseContext>

declare global {
	export interface ArkRegistry {
		ambient: Scope<ambient>
	}
}

export const scope: ScopeParser = ((def: Dict, config: ArkConfig = {}) =>
	new Scope(def, config)) as never

export class Scope<$ = any> extends BaseScope<$> {
	private parseCache: Record<string, TypeNode> = {}

	constructor(def: Record<string, unknown>, config?: ArkConfig) {
		const aliases: Record<string, unknown> = {}
		for (const k in def) {
			const parsedKey = parseScopeKey(k)
			aliases[parsedKey.name] = parsedKey.params.length
				? generic(parsedKey.params, def[k], this)
				: def[k]
		}
		super(aliases, config)
	}

	type: TypeParser<$> = createTypeParser(this as never) as never

	match: MatchParser<$> = createMatchParser(this as never) as never

	declare: DeclarationParser<$> = () => ({ type: this.type }) as never

	define: DefinitionParser<$> = (def) => def as never

	// TODO: name?
	get<name extends exportedName<$>>(name: name): Type<$[name], $> {
		return this.export()[name] as never
	}

	parse(def: unknown, ctx: ParseContext): TypeNode {
		if (typeof def === "string") {
			if (ctx.args && Object.keys(ctx.args).every((k) => !def.includes(k))) {
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

	parseTypeRoot(def: unknown, input?: ParseContextInput): TypeNode {
		return this.parse(def, {
			args: { this: {} as TypeNode },
			baseName: "type",
			path: [],
			$: this,
			...input
		})
	}

	parseString(def: string, ctx: ParseContext): TypeNode {
		return (
			this.maybeResolveNode(def) ??
			((def.endsWith("[]") &&
				this.maybeResolveNode(def.slice(0, -2))?.array()) ||
				fullStringParse(new DynamicState(def, ctx)))
		)
	}

	import<names extends exportedName<$>[]>(
		...names: names
	): destructuredImportContext<
		$,
		names extends [] ? exportedName<$> : names[number]
	> {
		return this.rawImport(...names) as never
	}

	export<names extends exportedName<$>[]>(
		...names: names
	): Module<
		names extends [] ? $ : destructuredExportContext<$, names[number]>
	> {
		return this.rawExport(...names) as never
	}
}

type ExportCache = Record<string, Type | Generic | Module>

const resolutionsOfModule = (typeSet: ExportCache) => {
	const result: MergedResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule(v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "generic")) {
			result[k] = v
		} else {
			result[k] = v.root
		}
	}
	return result
}

type destructuredExportContext<$, name extends exportedName<$>> = {
	[k in name]: $[k]
}

type destructuredImportContext<$, name extends exportedName<$>> = {
	[k in name as `#${k & string}`]: type.cast<$[k]>
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
