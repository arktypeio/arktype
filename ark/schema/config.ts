import {
	keysOf,
	type ArkRegistry,
	type dict,
	type mutable,
	type requireKeys,
	type show
} from "@ark/util"
import type { intrinsic } from "./intrinsic.ts"
import type { nodesByRegisteredId } from "./parse.ts"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.ts"
import {
	defaultValueSerializer,
	isNodeKind,
	type DescriptionWriter,
	type NodeKind
} from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import type { UndeclaredKeyBehavior } from "./structure/structure.ts"

export interface ArkSchemaRegistry extends ArkRegistry {
	intrinsic: typeof intrinsic
	config: ArkConfig
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

export interface UnknownErrorWriters {
	expected?: ExpectedWriter
	actual?: ActualWriter
	problem?: ProblemWriter
	message?: MessageWriter
}

interface UnknownNodeConfig extends UnknownErrorWriters {
	description?: DescriptionWriter
}

export type ResolvedUnknownNodeConfig = requireKeys<
	UnknownNodeConfig,
	"description"
>

// $ark.config could already be set if it were imported previously from the
// dedicated config entrypoint, in which case we don't want to reinitialize it
$ark.config ??= {}

export const configure = (config: ArkConfig): ArkConfig => {
	const result = Object.assign($ark.config, mergeConfigs($ark.config, config))

	$ark.resolvedConfig &&= mergeConfigs($ark.resolvedConfig, result)

	return result
}

export const mergeConfigs = <base extends ArkConfig>(
	base: base,
	extensions: ArkConfig
): mutable<base extends ResolvedConfig ? ResolvedConfig : ArkConfig> => {
	// always maintains alphabetized keys (important for normalized comparisons)
	const keys = keysOf({ ...base, ...extensions }).sort()

	const result: any = {}

	for (const k of keys) {
		let v: unknown
		if (isNodeKind(k)) {
			if (base[k]) {
				if (extensions[k]) {
					v = {
						...base[k],
						...extensions[k]
					}
				} else v = base[k]
			} else v = extensions[k]
		} else v = extensions[k] === undefined ? base[k] : extensions[k]

		if (v !== undefined) result[k] = v
	}

	return result
}

export type CloneImplementation = <original extends object>(
	original: original
) => original

export interface ArkConfig extends Partial<Readonly<NodeConfigsByKind>> {
	jitless?: boolean
	clone?: boolean | CloneImplementation
	onUndeclaredKey?: UndeclaredKeyBehavior
	numberAllowsNaN?: boolean
	dateAllowsInvalid?: boolean
}

export type resolveConfig<config extends ArkConfig> = show<
	{
		[k in keyof ArkConfig]-?: k extends NodeKind ? Required<config[k]>
		: k extends "clone" ? CloneImplementation | false
		: config[k]
	} & Omit<config, keyof ArkConfig>
>

export type ResolvedConfig = resolveConfig<ArkConfig>

export const serializeConfig = (config: ArkConfig): string => {
	const keys = keysOf(config).sort()
	const serializableConfig: dict = {}

	for (const k of keys) {
		serializableConfig[k] =
			isNodeKind(k) ?
				serializeNodeConfig(config[k]!)
			:	defaultValueSerializer(config[k])
	}

	return JSON.stringify(serializableConfig)
}

const serializeNodeConfig = (nodeConfig: dict) => {
	const keys = Object.keys(nodeConfig).sort()

	const result: dict = {}

	for (const k of keys) result[k] = defaultValueSerializer(nodeConfig[k])

	return result
}
