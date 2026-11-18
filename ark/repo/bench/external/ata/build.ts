// precompiles validators.ts into out/validators.js, as the default build in a
// production esbuild bundle, for the arktype adapter impls.patch adds to ata's
// validator-benchmarks (it imports the file as typia's adapter imports
// typia/dist/validators.js)
// node ata/build.ts
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"

const here = import.meta.dirname

await build({
	entryPoints: [join(here, "validators.ts")],
	outfile: join(here, "out", "validators.js"),
	bundle: true,
	format: "esm",
	platform: "node",
	conditions: ["production"],
	logLevel: "warning",
	plugins: [precompile.esbuild({ cwd: here })]
})
