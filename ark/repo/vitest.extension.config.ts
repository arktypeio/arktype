import { defaultExclude, defineConfig, mergeConfig } from "vitest/config"
import baseConfig from "./vitest.config.js"

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			// temporarily disabling Vitest Explorer while some crashes are resolved
			include: [],
			exclude: [...defaultExclude, "**/attest/**"],
			pool: "forks"
		}
	})
)
