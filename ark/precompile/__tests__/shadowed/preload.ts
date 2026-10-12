import { precompile, type BunPlugin } from "@ark/precompile/bun"

declare const Bun: { plugin(plugin: BunPlugin): void }

Bun.plugin(
	precompile({ conditions: ["ark-ts"], shadow: true, cwd: import.meta.dirname })
)
