import { buildSync } from "esbuild"
import { join } from "node:path"
import { compileWorkerUrl } from "../components/home/compileState.ts"
import { liveWorkerUrl } from "../components/home/liveState.ts"
import { docsDir, publicDir } from "./content/paths.ts"

/** each of the homepage's workers: its source in components/home, and where it is served from */
const workers = [
	["ark.worker.ts", liveWorkerUrl],
	["compile.worker.ts", compileWorkerUrl]
]

/**
 * Turbopack copies the source of `new Worker(new URL("./ark.worker.ts", …))`
 * as an asset instead of bundling it, so the homepage's workers (the live
 * type() line's parser, and the precompile figure's precompiler) are bundled
 * here when the config loads and served from public/.
 */
export const writeLiveWorker = () => {
	for (const [source, url] of workers) {
		buildSync({
			entryPoints: [join(docsDir, "components", "home", source)],
			outfile: join(publicDir, url),
			bundle: true,
			format: "esm",
			platform: "browser",
			target: "es2022",
			minify: true,
			logLevel: "warning"
		})
	}
}
