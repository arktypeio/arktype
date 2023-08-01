import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["src/main.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true
})
