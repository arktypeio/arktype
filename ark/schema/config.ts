import type { ArkRegistry, mutable, requireKeys, show } from "@ark/util"
import type { intrinsic } from "./intrinsic.js"
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
import { $ark } from "./shared/registry.js"

export interface ArkSchemaRegistry extends ArkRegistry {
	intrinsic: typeof intrinsic
	config: ArkConfig
	defaultConfig: ResolvedArkConfig
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
}

export type resolveConfig<config extends ArkConfig> = show<
	{
		[k in keyof ArkConfig]-?: k extends NodeKind ? Required<config[k]>
		:	config[k]
	} & Omit<config, keyof ArkConfig>
>

export type ResolvedArkConfig = resolveConfig<ArkConfig>

export const extendConfig = (
	base: ArkConfig,
	extension: ArkConfig | undefined
): ArkConfig => {
	if (!extension) return base
	const result = mergeConfigs(base, extension)
	return result
}

export const resolveConfig = <config extends ArkConfig>(
	config: config | undefined
): resolveConfig<config> =>
	extendConfig(extendConfig($ark.defaultConfig, $ark.config), config) as never
