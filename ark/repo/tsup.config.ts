import { defineConfig } from "tsup"

export default defineConfig({
	tsconfig: "tsconfig.build.json",
	entry: ["main.ts"],
	format: ["cjs", "esm"],
	experimentalDts: true,
	clean: true
})
