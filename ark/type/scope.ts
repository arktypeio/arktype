import {
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
	type InternalResolutions,
	type Node,
	type NodeKind,
	type NodeParseOptions,
	type NodeSchema,
	type PreparsedNodeResolution,
	type PrivateDeclaration,
	type RootKind,
	type RootSchema,
	type arkKind,
	type destructuredExportContext,
	type destructuredImportContext,
	type exportedNameOf,
	type reducibleKindOf,
	type toInternalScope,
	type writeDuplicateAliasError
} from "@ark/schema"
import {
	bound,
	domainOf,
	hasDomain,
	isThunk,
	throwParseError,
	type Dict,
	type ErrorType,
	type Json,
	type anyOrNever,
	type array,
	type flattenListable,
	type nominal,
	type show
} from "@ark/util"
import type { Ark, type } from "./ark.js"
import {
	parseGenericParams,
	type Generic,
	type GenericDeclaration,
	type GenericHktParser,
	type ParameterString,
	type baseGenericConstraints,
	type parseValidGenericParams
} from "./generic.js"
import type { Module, instantiateExport } from "./module.js"
import {
	parseObject,
	writeBadDefinitionTypeMessage,
	type inferDefinition,
	type validateDefinition
} from "./parser/definition.js"
import { DynamicState } from "./parser/string/reduce/dynamic.js"
import type { ParsedDefault } from "./parser/string/shift/operator/default.js"
import { writeUnexpectedCharacterMessage } from "./parser/string/shift/operator/operator.js"
import { Scanner } from "./parser/string/shift/scanner.js"
import {
	fullStringParse,
	type StringParseResult
} from "./parser/string/string.js"
import {
	InternalTypeParser,
	type DeclarationParser,
	type DefinitionParser,
	type Type,
	type TypeParser
} from "./type.js"

export type ScopeParser = <const def>(
	def: validateScope<def>,
	config?: ArkScopeConfig
) => Scope<inferScope<def>>

export type validateScope<def> = {
	[k in keyof def]: k extends symbol ?
		// this should only occur when importing/exporting modules, and those
		// keys should be ignored
		unknown
	: parseScopeKey<k, def>["params"] extends infer params ?
		params extends array<GenericParamAst> ?
			params["length"] extends 0 ?
				// not including Type here directly breaks some cyclic tests (last checked w/ TS 5.5).
				// if you are from the future with a better version of TS and can remove it
				// without breaking `pnpm typecheck`, go for it.
				def[k] extends Type | PreparsedResolution ? def[k]
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
	[k in keyof def & GenericDeclaration as extractGenericName<k>]: GenericAst<
		parseValidGenericParams<extractGenericParameters<k>, bootstrapAliases<def>>,
		def[k],
		UnparsedScope
	>
}

type inferBootstrapped<$> = show<{
	[name in keyof $]: $[name] extends Def<infer def> ?
		inferDefinition<def, $, {}>
	: $[name] extends GenericAst<infer params, infer def> ?
		// add the scope in which the generic was defined here
		Generic<params, def, $>
	:	// otherwise should be a submodule
		$[name]
}>

type extractGenericName<k> =
	k extends GenericDeclaration<infer name> ? name : never

type extractGenericParameters<k> =
	// using extends GenericDeclaration<string, infer params>
	// causes TS fail to infer a narrowed result as of 5.5
	k extends `${string}<${infer params}>` ? ParameterString<params> : never

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
	[k in keyof $]: $[k] extends { [arkKind]: "module" } ?
		[$[k]] extends [anyOrNever] ?
			never
		:	k & string
	:	never
}[keyof $]

export type tryInferSubmoduleReference<$, token> =
	token extends `${infer submodule extends moduleKeyOf<$>}.${infer subalias}` ?
		subalias extends keyof $[submodule] ?
			$[submodule][subalias]
		:	never
	: token extends `${infer submodule}.${infer subalias}` ?
		submodule extends moduleKeyOf<Ark> ?
			subalias extends keyof Ark[submodule] ?
				Ark[submodule][subalias] extends infer resolution ?
					resolution extends type.cast<infer t> ?
						t
					:	resolution
				:	never
			:	never
		:	never
	:	never

export interface ParseContext extends TypeParseOptions {
	$: InternalScope
}

export interface TypeParseOptions {
	args?: GenericArgResolutions
}

export const scope: ScopeParser = ((def: Dict, config: ArkScopeConfig = {}) =>
	new InternalScope(def, config)) as never

export class InternalScope<
	$ extends InternalResolutions = InternalResolutions
> extends BaseScope<$> {
	private parseCache: Record<string, StringParseResult> = {}

	type: InternalTypeParser = new InternalTypeParser(this as never)

	declare: () => { type: InternalTypeParser } = (() => ({
		type: this.type
	})).bind(this)

	define: (def: unknown) => unknown = ((def: unknown) => def).bind(this)

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

	override preparseRoot(def: unknown): unknown {
		if (isThunk(def) && !hasArkKind(def, "generic")) return def()

		return def
	}

	@bound
	parseRoot(def: unknown, opts: TypeParseOptions = {}): BaseRoot {
		const node: BaseRoot = this.parse(
			def,
			Object.assign(
				this.finalizeRootArgs(opts, () => node),
				{ $: this as never }
			)
		).bindScope(this)
		return node
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
}

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
	): Node<reducibleKindOf<flattenListable<kinds>>>

	type: TypeParser<$>

	declare: DeclarationParser<$>

	define: DefinitionParser<$>

	generic: GenericHktParser<$>

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): Module<show<destructuredImportContext<$, names>>>

	export<names extends exportedNameOf<$>[]>(
		...names: names
	): Module<show<destructuredExportContext<$, names>>>

	resolve<name extends exportedNameOf<$>>(
		name: name
	): instantiateExport<$[name], $>
}

export const Scope: new <$ = {}>(
	...args: ConstructorParameters<typeof InternalScope>
) => Scope<$> = InternalScope as never

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
