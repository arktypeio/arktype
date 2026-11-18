// bundles arktype.ts into out/dynamic.mjs and, precompiled as a production
// build with the default options, out/b1.mjs, resolving schema-benchmarks'
// workspace imports to its sources; child.ts runs them
// SB=<schema-benchmarks clone> SB_MODULES=<its dependencies> node sb/bundle.ts
import { precompile } from "@ark/aot/unplugin"
import { build, type Plugin } from "esbuild"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const sb = process.env.SB ?? "../schema-benchmarks"
const here = import.meta.dirname
const nodePaths = [process.env.SB_MODULES ?? join(sb, "node_modules")]

const aliases: Record<string, string> = {
	"#src": join(sb, "schemas/src/index.ts"),
	"@schema-benchmarks/utils": join(sb, "utils/src/index.ts"),
	"@schema-benchmarks/json-schema-tests/remotes": join(
		here,
		"shims/remotes.ts"
	),
	"zod-compiler": join(here, "shims/empty.ts")
}

const workspace: Plugin = {
	name: "workspace",
	setup: b => {
		b.onResolve(
			{ filter: /^(#src|@schema-benchmarks\/|zod-compiler$)/ },
			args => (aliases[args.path] ? { path: aliases[args.path] } : undefined)
		)
		// a build-time macro there; a plain import here
		b.onLoad(
			{ filter: /schema-benchmarks\/schemas\/libraries\/.*\.ts$/ },
			args => ({
				contents: readFileSync(args.path, "utf8").replaceAll(
					/\s*with { type: "macro" }/g,
					""
				),
				loader: "ts"
			})
		)
	}
}

// the benchmark's data, which child.ts imports beside each bundle
await build({
	entryPoints: [join(sb, "schemas/src/data.ts")],
	outfile: join(here, "out", "data.mjs"),
	bundle: true,
	format: "esm",
	platform: "node",
	nodePaths,
	logLevel: "error",
	plugins: [workspace]
})

for (const [name, options] of [
	["dynamic", undefined],
	["b1", {}]
] as const) {
	await build({
		entryPoints: [join(here, "arktype.ts")],
		outfile: join(here, "out", `${name}.mjs`),
		bundle: true,
		format: "esm",
		platform: "node",
		target: "node24",
		conditions: ["production"],
		nodePaths,
		logLevel: "error",
		plugins: [
			workspace,
			...(options ? [precompile.esbuild({ cwd: here, ...options })] : [])
		]
	})
}
