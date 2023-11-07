import { defineConfig } from "tsup"

export default defineConfig({
	entry: ["main.ts"],
	format: ["esm"],
	dts: true,
	clean: true
})
