import { $ark, resolveGlobalConfig } from "@ark/schema"
import { configure, type, type ArkConfig } from "arktype"

// configure throws once a Type exists, so this configures as if none did,
// then resolves the global config as the first Type would
export const reconfigure = (config: ArkConfig): void => {
	delete $ark.resolvedConfig
	configure(config)
	$ark.resolvedConfig = resolveGlobalConfig($ark.defaultConfig)
}

// configure assigns to $ark.config in place, so restore from a copy
export const withConfig = <t>(config: ArkConfig, fn: () => t): t => {
	// a scope keeps the config it first reads, so the ambient scope reads the
	// original, as it would once a Type exists
	void type.$.internal.resolvedConfig
	const originalConfig = { ...$ark.config }
	const originalResolvedConfig = $ark.resolvedConfig!
	reconfigure(config)
	try {
		return fn()
	} finally {
		$ark.config = originalConfig
		// resolving the original config restores the locale reads render in
		reconfigure({})
		$ark.resolvedConfig = originalResolvedConfig
	}
}
