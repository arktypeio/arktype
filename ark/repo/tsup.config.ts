import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["main.ts"],
	format: ["cjs"],
	// dts: true,
	clean: true
})
