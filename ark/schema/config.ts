import { map } from "@arktype/util"
import { nodesByKind } from "./kinds.js"
import type { ArkConfig, ParsedArkConfig } from "./scope.js"

export const defaultConfig: ParsedArkConfig = map(nodesByKind, (kind, node) => [
	kind,
	node.implementation.defaults
]) as never

export const globalConfig = { ...defaultConfig }

export const configure = (config: ArkConfig) => {
	let kind: keyof ArkConfig
	for (kind in config) {
		globalConfig[kind] = { ...globalConfig[kind], ...config[kind] } as never
	}
	return globalConfig
}
