import {
	envHasCsp,
	hasDomain,
	printable,
	throwParseError,
	type ArkRegistry,
	type dict,
	type requireKeys,
	type show
} from "@ark/util"
import type { intrinsic } from "./intrinsic.ts"
import type { BaseNode } from "./node.ts"
import type { nodesById } from "./parse.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { RootApplyRuntime } from "./shared/rootApply.ts"
import type { BaseScope } from "./scope.ts"
import type { TypeMeta } from "./shared/declare.ts"
import {
	configureAfterTypeMessage,
	configureLocale,
	type ActualConfig,
	type ArkErrorCode,
	type ArkErrors,
	type ExpectedConfig,
	type MessageConfig,
	type ProblemConfig
} from "./shared/errors.ts"
import {
	isNodeKind,
	type DescriptionWriter,
	type NodeKind
} from "./shared/implement.ts"
import { validateStandardJsonSchemaTarget } from "./shared/jsonSchema.ts"
import type { Locale } from "./shared/locale.ts"
import { $ark } from "./shared/registry.ts"
import type { SetEngine } from "./shared/sets.ts"
import type { InPlaceTransforms } from "./shared/transform.ts"
import { ToJsonSchema } from "./shared/toJsonSchema.ts"
import type { UndeclaredKeyBehavior } from "./structure/structure.ts"

export interface ArkSchemaRegistry extends ArkRegistry {
	/** the intrinsic nodes keywords are built from, like `unknown` and `string` */
	kw: typeof intrinsic
	config: ArkSchemaConfig
	defaultConfig: ResolvedConfig
	cfg?: ResolvedConfig
	nodesById: typeof nodesById
	sets?: SetEngine
	encode?: (node: BaseRoot) => BaseRoot
	inPlace?: InPlaceTransforms
	// standalone builds check a default where its Type is created
	deferDefaultCheck?:
		| ((
				node: BaseRoot,
				value: unknown,
				key: PropertyKey | null,
				owner: BaseNode | undefined
		  ) => boolean)
		| undefined
	reached?: CacheReach | undefined
	// installed by @ark/schema/errors
	errorModes?: Record<"first" | "none", RootApplyRuntime>
}

// what a definition reaches through a cache, read by standalone builds
export interface CacheReach {
	// a node returned from the node cache
	node: (node: BaseNode) => void
	// an entry returned from another cache
	cached: (cache: object, key: unknown) => void
	// a Scope alias the definition resolves
	alias: ($: BaseScope, alias: string) => void
	mark: () => number | undefined
	store: (mark: number | undefined, cache: object, key: unknown) => void
}

type nodeConfigForKind<kind extends NodeKind> = Readonly<
	show<
		{
			description?: DescriptionWriter<kind>
		} & (kind extends ArkErrorCode ? ErrorConfig<kind> : {})
	>
>

export type ErrorConfig<code extends ArkErrorCode = ArkErrorCode> = {
	expected?: ExpectedConfig<code>
	actual?: ActualConfig<code>
	problem?: ProblemConfig<code>
	message?: MessageConfig<code>
}

type NodeConfigsByKind = {
	[kind in NodeKind]: nodeConfigForKind<kind>
}

export type NodeConfig<kind extends NodeKind = NodeKind> =
	NodeConfigsByKind[kind]

export interface UnknownErrorConfigs {
	expected?: ExpectedConfig
	actual?: ActualConfig
	problem?: ProblemConfig
	message?: MessageConfig
}

interface UnknownNodeConfig extends UnknownErrorConfigs {
	description?: DescriptionWriter
}

export type ResolvedUnknownNodeConfig = requireKeys<
	UnknownNodeConfig,
	"description"
>

// $ark.config could already be set if it were imported previously from the
// dedicated config entrypoint, in which case we don't want to reinitialize it
$ark.config ??= {}

export const configureSchema = (config: ArkSchemaConfig): ArkSchemaConfig => {
	if (config.locale !== undefined && !hasDomain(config.locale, "object"))
		throwParseError(writeInvalidLocaleMessage(config.locale))
	const merged = mergeConfigs($ark.config, config)
	// a config file evaluated again, like after a test runner resets its
	// modules, can reapply what's already set
	if ($ark.cfg && !isSameConfig(merged, $ark.config))
		return throwParseError(configureAfterTypeMessage)
	return Object.assign($ark.config, merged)
}

const isSameConfig = (l: unknown, r: unknown): boolean => {
	if (l === r) return true
	// functions are only the same by reference
	if (typeof l !== "object" || typeof r !== "object" || !l || !r) return false
	const entries = Object.entries(l)
	return (
		entries.length === Object.keys(r).length &&
		entries.every(([k, v]) => isSameConfig(v, (r as dict)[k]))
	)
}

/** $ark.config merged over base, with its static locale */
export const resolveGlobalConfig = (base: ResolvedConfig): ResolvedConfig => {
	const resolved = mergeConfigs(
		// probed as the config is fixed, so configuring jitless after import skips it
		{ ...base, jitless: $ark.config.jitless ?? envHasCsp() },
		$ark.config
	)
	// a locale function selects a locale per read, which is en if it returns none
	;(resolved as { locale: Locale }).locale = configureLocale(
		$ark.config.locale,
		base
	)
	return resolved
}

export const writeInvalidLocaleMessage = (locale: unknown): string =>
	`locale must be a Locale or a function returning one (was ${printable(locale)})`

export const mergeConfigs = <base extends ArkSchemaConfig>(
	base: base,
	merged: ArkSchemaConfig | undefined
): base => {
	if (!merged) return base
	const result: any = { ...base, ...merged }
	let k: keyof ArkSchemaConfig
	for (k in merged) {
		const keywords = { ...base.keywords }
		if (k === "keywords") {
			for (const flatAlias in merged[k]) {
				const v = merged.keywords![flatAlias]
				if (v === undefined) continue
				keywords[flatAlias] = typeof v === "string" ? { description: v } : v
			}
			result.keywords = keywords
		} else if (k === "toJsonSchema") {
			result[k] = mergeToJsonSchemaConfigs(
				base.toJsonSchema,
				merged.toJsonSchema
			)
		} else if (isNodeKind(k) || k === "undeclared" || k === "discriminant") {
			result[k] =
				// not casting this makes TS compute a very inefficient
				// type that is not needed
				{
					...base[k],
					...merged[k]
				} as never
		}
	}
	return result
}

const jsonSchemaTargetToDialect: Record<ToJsonSchema.Target, string | null> = {
	"draft-2020-12": "https://json-schema.org/draft/2020-12/schema",
	"draft-07": "http://json-schema.org/draft-07/schema#",
	// an OpenAPI Schema Object has no $schema
	"openapi-3.0": null
}

type MergeToJsonSchemaConfigs = <base extends ToJsonSchema.Options | undefined>(
	baseConfig: base,
	mergedConfig: ToJsonSchema.Options | undefined
) => base extends ToJsonSchema.Context ? ToJsonSchema.Context
:	ToJsonSchema.Options

export const mergeToJsonSchemaConfigs: MergeToJsonSchemaConfigs = ((
	baseConfig: ToJsonSchema.Options | undefined,
	mergedConfig: ToJsonSchema.Options | undefined
) => {
	if (!baseConfig)
		return resolveTargetToDialect(mergedConfig ?? {}, mergedConfig)
	if (!mergedConfig) return baseConfig

	const result: ToJsonSchema.Options = { ...baseConfig }

	let k: keyof ToJsonSchema.Options
	for (k in mergedConfig) {
		if (k === "fallback") {
			result.fallback = mergeFallbacks(
				baseConfig.fallback,
				mergedConfig.fallback
			)
		} else result[k] = mergedConfig[k] as never
	}

	return resolveTargetToDialect(result, mergedConfig)
}) as MergeToJsonSchemaConfigs

const resolveTargetToDialect = <T extends ToJsonSchema.Options>(
	opts: T,
	userOpts: ToJsonSchema.Options | undefined
): T => {
	if (userOpts?.target === undefined) return opts
	const dialect =
		jsonSchemaTargetToDialect[validateStandardJsonSchemaTarget(userOpts.target)]
	// a dialect passed with the target was already merged and takes precedence
	return userOpts.dialect === undefined ? { ...opts, dialect } : opts
}

const mergeFallbacks = (
	base: ToJsonSchema.FallbackOption | undefined,
	merged: ToJsonSchema.FallbackOption | undefined
): ToJsonSchema.FallbackObject => {
	base = normalizeFallback(base)
	merged = normalizeFallback(merged)

	const result: ToJsonSchema.HandlerByCode = {} as never

	let code: ToJsonSchema.Code
	for (code in ToJsonSchema.defaultConfig.fallback) {
		result[code] =
			merged[code] ??
			merged.default ??
			base[code] ??
			base.default ??
			(ToJsonSchema.defaultConfig.fallback[code] as any)
	}

	return result
}

const normalizeFallback = (
	fallback?: ToJsonSchema.FallbackOption | ToJsonSchema.UniversalFallback
): ToJsonSchema.FallbackObject =>
	typeof fallback === "function" ? { default: fallback } : (fallback ?? {})

// which issues a failure reports
export type ErrorDetail = "all" | "first" | "none"

/**
 * #### whether a valid input is transformed in place
 *
 * - `false`: transforms copy what they change, so the input is never written
 * - `true`: writes where no other place can read what it wrote, else copies
 * - `"always"`: writes every transform into the input
 */
export type MutatesInput = boolean | "always"

export interface ArkSchemaConfig extends Partial<Readonly<NodeConfigsByKind>> {
	readonly undeclared?: Readonly<ErrorConfig<"undeclared">>
	readonly discriminant?: Readonly<ErrorConfig<"discriminant">>
	readonly jitless?: boolean
	readonly onUndeclaredKey?: UndeclaredKeyBehavior
	readonly numberAllowsNaN?: boolean
	readonly numberAllowsInfinity?: boolean
	readonly dateAllowsInvalid?: boolean
	readonly exactOptionalPropertyTypes?: boolean
	readonly onFail?: ArkErrors.Handler | null
	readonly errors?: ErrorDetail
	readonly mutatesInput?: MutatesInput
	readonly keywords?: Record<string, TypeMeta.Collapsible | undefined>
	readonly toJsonSchema?: ToJsonSchema.Options
	readonly locale?: Locale | (() => Locale | undefined)
}

export type resolveConfig<config extends ArkSchemaConfig> = show<
	{
		[k in keyof ArkSchemaConfig]-?: k extends NodeKind | ArkErrorCode ?
			Required<config[k]>
		: k extends "keywords" ? Record<string, TypeMeta | undefined>
		: k extends "toJsonSchema" ? ToJsonSchema.Context
		: k extends "locale" ? Locale
		: config[k]
	} & Omit<config, keyof ArkSchemaConfig>
>

export type ResolvedConfig = resolveConfig<ArkSchemaConfig>
