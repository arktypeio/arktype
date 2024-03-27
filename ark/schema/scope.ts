import {
	flatMorph,
	type array,
	type evaluate,
	type requireKeys
} from "@arktype/util"
import { mergeConfigs } from "./config.js"
import { nodesByKind } from "./kinds.js"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.js"
import type { DescriptionWriter, NodeKind } from "./shared/implement.js"
import type { Type } from "./types/type.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: Type }

export type BaseResolutions = Record<string, Type>

declare global {
	export interface StaticArkConfig {
		preserve(): never
	}
}

type nodeConfigForKind<kind extends NodeKind> = Readonly<
	evaluate<
		{
			description?: DescriptionWriter<kind>
		} & (kind extends ArkErrorCode
			? {
					expected?: ExpectedWriter<kind>
					actual?: ActualWriter<kind>
					problem?: ProblemWriter<kind>
					message?: MessageWriter<kind>
			  }
			: {})
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

export type ParsedUnknownNodeConfig = requireKeys<
	UnknownNodeConfig,
	"description"
>

export type StaticArkOption<k extends keyof StaticArkConfig> = ReturnType<
	StaticArkConfig[k]
>

export interface ArkConfig extends Partial<Readonly<NodeConfigsByKind>> {
	/** @internal */
	readonly prereducedAliases?: boolean
	/** @internal */
	readonly registerKeywords?: boolean
}

type resolveConfig<config extends ArkConfig> = {
	[k in keyof config]-?: k extends NodeKind ? Required<config[k]> : config[k]
}

export type ResolvedArkConfig = resolveConfig<ArkConfig>

export const defaultConfig: ResolvedArkConfig = Object.assign(
	flatMorph(nodesByKind, (kind, node) => [kind, node.implementation.defaults]),
	{
		prereducedAliases: false,
		registerKeywords: false
	} satisfies Omit<ResolvedArkConfig, NodeKind>
) as never

const nonInheritedKeys = [
	"registerKeywords",
	"prereducedAliases"
] as const satisfies array<keyof ArkConfig>

const extendConfig = (
	base: ArkConfig,
	extension: ArkConfig | undefined
): ArkConfig => {
	if (!extension) return base
	const result = mergeConfigs(base, extension)
	nonInheritedKeys.forEach((k) => {
		if (!(k in extension)) delete result[k]
	})
	return result
}

const resolveConfig = (scopeConfig: ArkConfig | undefined): ResolvedArkConfig =>
	extendConfig(defaultConfig, scopeConfig) as never
