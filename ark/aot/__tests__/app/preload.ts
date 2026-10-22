import { precompile, type BunPlugin } from "@ark/aot/bun"

declare const Bun: { plugin(plugin: BunPlugin): void }

Bun.plugin(
	precompile({
		conditions: ["ark-ts"],
		runtime: process.env.ARKTYPE_RUNTIME === "arktype" ? "arktype" : undefined,
		config: process.env.ARKTYPE_CONFIG || undefined,
		errors: process.env.ARKTYPE_ERRORS === "none" ? "none" : undefined
	})
)
