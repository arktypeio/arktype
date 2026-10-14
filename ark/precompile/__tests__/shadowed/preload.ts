import { precompile, type BunPlugin } from "@ark/precompile/bun"

declare const Bun: { plugin(plugin: BunPlugin): void }

Bun.plugin(
	precompile({
		// the options shadow.test.ts builds with, which a parity run sets
		...JSON.parse(process.env.ARK_PRECOMPILE_OPTIONS ?? "{}"),
		conditions: ["ark-ts"],
		shadow: true,
		cwd: import.meta.dirname
	})
)
