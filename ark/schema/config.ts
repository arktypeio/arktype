import type { ArkRegistry, requireKeys, show } from "@ark/util"
import type { intrinsic } from "./intrinsic.ts"
import type { nodesByRegisteredId } from "./parse.ts"
import type { TypeMeta } from "./shared/declare.ts"
import type {
	ActualConfig,
	ArkErrorCode,
	ArkErrors,
	ExpectedConfig,
	MessageConfig,
	ProblemConfig
} from "./shared/errors.ts"
import {
	isNodeKind,
	type DescriptionWriter,
	type NodeKind
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import { ToJsonSchema } from "./shared/toJsonSchema.ts"
import type { UndeclaredKeyBehavior } from "./structure/structure.ts"

export interface ArkSchemaRegistry extends ArkRegistry {
	intrinsic: typeof intrinsic
	config: ArkSchemaConfig
	defaultConfig: ResolvedConfig
	resolvedConfig: ResolvedConfig
	nodesByRegisteredId: typeof nodesByRegisteredId
}

type nodeConfigForKind<kind extends NodeKind> = Readonly<
	show<
		{
			description?: DescriptionWriter<kind>
		} & (kind extends ArkErrorCode ?
			{
				expected?: ExpectedConfig<kind>
				actual?: ActualConfig<kind>
				problem?: ProblemConfig<kind>
				message?: MessageConfig<kind>
			}
		:	{})
	>
>

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
	const result = Object.assign($ark.config, mergeConfigs($ark.config, config))

	$ark.resolvedConfig &&= mergeConfigs($ark.resolvedConfig, result)

	return result
}

export const mergeConfigs = <base extends ArkSchemaConfig>(
	base: base,
	merged: ArkSchemaConfig | undefined
): base => {
	if (!merged) return base
	const result: any = { ...base }
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
		} else if (isNodeKind(k)) {
			result[k] =
				// not casting this makes TS compute a very inefficient
				// type that is not needed
				{
					...base[k],
					...merged[k]
				} as never
		} else result[k] = merged[k]
	}
	return result
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
	if (!baseConfig) return mergedConfig ?? {}
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

	return result
}) as MergeToJsonSchemaConfigs

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

export type CloneImplementation = <original extends object>(
	original: original
) => original

export interface ArkSchemaConfig extends Partial<Readonly<NodeConfigsByKind>> {
	readonly jitless?: boolean
	readonly clone?: boolean | CloneImplementation
	readonly onUndeclaredKey?: UndeclaredKeyBehavior
	readonly numberAllowsNaN?: boolean
	readonly dateAllowsInvalid?: boolean
	readonly exactOptionalPropertyTypes?: boolean
	readonly onFail?: ArkErrors.Handler | null
	readonly keywords?: Record<string, TypeMeta.Collapsible | undefined>
	readonly toJsonSchema?: ToJsonSchema.Options
}

export type resolveConfig<config extends ArkSchemaConfig> = show<
	{
		[k in keyof ArkSchemaConfig]-?: k extends NodeKind ? Required<config[k]>
		: k extends "clone" ? CloneImplementation | false
		: k extends "keywords" ? Record<string, TypeMeta | undefined>
		: k extends "toJsonSchema" ? ToJsonSchema.Context
		: config[k]
	} & Omit<config, keyof ArkSchemaConfig>
>

export type ResolvedConfig = resolveConfig<ArkSchemaConfig>
