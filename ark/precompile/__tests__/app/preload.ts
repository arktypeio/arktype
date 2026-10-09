import { precompile, type BunPlugin } from "@ark/precompile/bun"

declare const Bun: { plugin(plugin: BunPlugin): void }

Bun.plugin(
	precompile({
		conditions: ["ark-ts"],
		runtime: process.env.ARKTYPE_RUNTIME === "arktype" ? "arktype" : undefined
	})
)
