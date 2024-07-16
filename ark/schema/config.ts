import type { array, mutable, requireKeys, show } from "@ark/util"
import type { Ark } from "./keywords/keywords.js"
import type { IntrinsicKeywords, RawRootScope } from "./scope.js"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.js"
import {
	isNodeKind,
	type DescriptionWriter,
	type NodeKind
} from "./shared/implement.js"

declare global {
	export interface ArkEnv {
		$(): Ark
		meta(): {}
		preserve(): never
		registry(): {
			ambient: RawRootScope
			intrinsic: IntrinsicKeywords
			config: ArkConfig
			defaultConfig: ResolvedArkConfig
		}
	}

	export namespace ArkEnv {
		export type $ = ReturnType<ArkEnv["$"]>
		export type meta = ReturnType<ArkEnv["meta"]>
		export type preserve = ReturnType<ArkEnv["preserve"]>
	}
}

type nodeConfigForKind<kind extends NodeKind> = Readonly<
	show<
		{
			description?: DescriptionWriter<kind>
		} & (kind extends ArkErrorCode ?
			{
				expected?: ExpectedWriter<kind>
				actual?: ActualWriter<kind>
				problem?: ProblemWriter<kind>
				message?: MessageWriter<kind>
			}
		:	{})
	>
>

type NodeConfigsByKind = {
	[kind in NodeKind]: nodeConfigForKind<kind>
}

export type NodeConfig<kind extends NodeKind = NodeKind> =
	NodeConfigsByKind[kind]

type UnknownNodeConfig = {
	description?: DescriptionWriter
	expected?: ExpectedWriter
	actual?: ActualWriter
	problem?: ProblemWriter
	message?: MessageWriter
}

export type ResolvedUnknownNodeConfig = requireKeys<
	UnknownNodeConfig,
	"description"
>

$ark.config = {}

export const configure = (config: ArkConfig): ArkConfig =>
	Object.assign($ark.config, mergeConfigs($ark.config, config))

export const mergeConfigs = (
	base: ArkConfig,
	extensions: ArkConfig
): mutable<ArkConfig> => {
	const result = { ...base }
	let k: keyof ArkConfig
	for (k in extensions) {
		result[k] =
			isNodeKind(k) ?
				{
					...(base as any)[k],
					...(extensions as any)[k]
				}
			:	(extensions[k] as never)
	}
	return result
}

export interface ArkConfig extends Partial<Readonly<NodeConfigsByKind>> {
	jitless?: boolean
	/** @internal */
	intrinsic?: boolean
	/** @internal */
	prereducedAliases?: boolean
}

type resolveConfig<config extends ArkConfig> = {
	[k in keyof config]-?: k extends NodeKind ? Required<config[k]> : config[k]
}

export type ResolvedArkConfig = resolveConfig<ArkConfig>

const nonInheritedKeys = [
	"intrinsic",
	"prereducedAliases"
] as const satisfies array<keyof ArkConfig>

export const extendConfig = (
	base: ArkConfig,
	extension: ArkConfig | undefined
): ArkConfig => {
	if (!extension) return base
	const result = mergeConfigs(base, extension)
	nonInheritedKeys.forEach(k => {
		if (!(k in extension)) delete result[k]
	})
	return result
}

export const resolveConfig = (
	config: ArkConfig | undefined
): ResolvedArkConfig =>
	extendConfig(extendConfig($ark.defaultConfig, $ark.config), config) as never
