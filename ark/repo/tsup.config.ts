import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["main.ts"],
	format: ["cjs", "esm"],
	// dts: true,
	clean: true
})
