import { morph } from "@arktype/util"
import { nodesByKind } from "./kinds.js"
import type { ArkConfig, ParsedArkConfig } from "./scope.js"
import type { NodeKind } from "./shared/implement.js"

export const defaultConfig: ParsedArkConfig = Object.assign(
	morph(nodesByKind, (kind, node) => [kind, node.implementation.defaults]),
	{ prereduced: false } satisfies Omit<ParsedArkConfig, NodeKind>
) as never

export const globalConfig = { ...defaultConfig }

export const configure = (config: ArkConfig) => {
	let kind: keyof ArkConfig
	for (kind in config) {
		globalConfig[kind] =
			kind === "prereduced"
				? config.prereduced
				: ({ ...globalConfig[kind], ...config[kind] } as any)
	}
	return globalConfig
}
