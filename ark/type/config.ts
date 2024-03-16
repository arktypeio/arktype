import { morph } from "@arktype/util"
import { nodesByKind } from "./kinds.js"
import type { ArkConfig, ResolvedArkConfig } from "./scope.js"
import { isNodeKind, type NodeKind } from "./shared/implement.js"

export const defaultConfig: ResolvedArkConfig = Object.assign(
	morph(nodesByKind, (kind, node) => [kind, node.implementation.defaults]),
	{
		prereducedAliases: false,
		ambient: null,
		registerKeywords: false
	} satisfies Omit<ResolvedArkConfig, NodeKind>
) as never

export const globalConfig: ResolvedArkConfig = { ...defaultConfig }

export const configure = (config: ArkConfig): ResolvedArkConfig => {
	let kind: keyof ArkConfig
	for (kind in config) {
		globalConfig[kind] = isNodeKind(kind)
			? ({ ...globalConfig[kind], ...config[kind] } as any)
			: config[kind]
	}
	return globalConfig
}
