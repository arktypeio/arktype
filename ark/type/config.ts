import { morph } from "@arktype/util"
import { nodesByKind } from "./kinds.js"
import type { ArkConfig, ParsedArkConfig } from "./scope.js"
import type { NodeKind } from "./shared/implement.js"

export const defaultConfig: ParsedArkConfig = Object.assign(
	morph(nodesByKind, (kind, node) => [kind, node.implementation.defaults]),
	{ prereducedAliases: false } satisfies Omit<ParsedArkConfig, NodeKind>
) as never

export const globalConfig: ParsedArkConfig = { ...defaultConfig }

export const configure = (config: ArkConfig): ParsedArkConfig => {
	let kind: keyof ArkConfig
	for (kind in config) {
		globalConfig[kind] =
			kind === "prereducedAliases"
				? config.prereducedAliases
				: ({ ...globalConfig[kind], ...config[kind] } as any)
	}
	return globalConfig
}
