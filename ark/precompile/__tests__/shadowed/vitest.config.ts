import { precompile } from "@ark/precompile/unplugin"
import { defaultClientConditions, defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

export default defineConfig({
	plugins: [
		precompile.vite({ shadow: true, conditions, cwd: import.meta.dirname })
	],
	resolve: { conditions: [...conditions, ...defaultClientConditions] },
	ssr: {
		resolve: {
			conditions: [...conditions, ...defaultServerConditions],
			externalConditions: conditions
		}
	}
})
