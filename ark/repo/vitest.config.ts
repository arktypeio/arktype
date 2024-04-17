import { fromHere } from "@arktype/fs"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		root: fromHere("..", ".."),
		globalSetup: fromHere("vitest.globalSetup.ts"),
		isolate: false,
		fileParallelism: false,
		coverage: {
			provider: "v8",
			ignoreEmptyLines: true
		}
	}
})
