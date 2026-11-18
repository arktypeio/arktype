import { precompile } from "@ark/aot/unplugin"
import { defaultClientConditions, defaultServerConditions } from "vite"
import { defineConfig } from "vitest/config"

// arktype's packages resolve to their source in this repo
const conditions = ["ark-ts"]

// the options shadow.test.ts builds with, which a parity run sets
const tested = JSON.parse(process.env.ARK_PRECOMPILE_OPTIONS ?? "{}")

export default defineConfig({
	plugins: [
		precompile.vite({
			...tested,
			shadow: true,
			// observe.ts catches a ParseError it creates on purpose
			allowUnsafe: true,
			conditions,
			cwd: import.meta.dirname
		})
	],
	resolve: { conditions: [...conditions, ...defaultClientConditions] },
	ssr: {
		resolve: {
			conditions: [...conditions, ...defaultServerConditions],
			externalConditions: conditions
		}
	}
})
