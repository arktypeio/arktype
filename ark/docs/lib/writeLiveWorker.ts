import { buildSync } from "esbuild"
import { join } from "node:path"
import { compileWorkerUrl } from "../components/precompile/compileState.ts"
import { docsDir, publicDir } from "./content/paths.ts"

/**
 * Turbopack copies the source of `new Worker(new URL("./compile.worker.ts", …))`
 * as an asset instead of bundling it, so the precompile page's worker (the
 * precompiler, run on what a reader types) is bundled here when the config
 * loads and served from public/.
 */
export const writeLiveWorker = () => {
	buildSync({
		entryPoints: [
			join(docsDir, "components", "precompile", "compile.worker.ts")
		],
		outfile: join(publicDir, compileWorkerUrl),
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		minify: true,
		logLevel: "warning"
	})
}
