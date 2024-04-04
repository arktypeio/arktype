import type { mutable } from "@arktype/util"
import type { ArkConfig } from "./scope.js"
import { isNodeKind } from "./shared/implement.js"

export const globalConfig: mutable<ArkConfig> = {}

export const mergeConfigs = (
	base: ArkConfig,
	extensions: ArkConfig
): mutable<ArkConfig> => {
	const result = { ...base }
	let k: keyof ArkConfig
	for (k in extensions) {
		result[k] = isNodeKind(k)
			? ({
					...base[k],
					...extensions[k]
				} as never)
			: (extensions[k]! as never)
	}
	return result
}

export const configure = (config: ArkConfig): ArkConfig =>
	Object.assign(globalConfig, mergeConfigs(globalConfig, config))
