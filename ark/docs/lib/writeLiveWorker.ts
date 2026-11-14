import { buildSync } from "esbuild"
import { join } from "node:path"
import { liveWorkerUrl } from "../components/home/liveState.ts"
import { docsDir, publicDir } from "./content/paths.ts"

/**
 * Turbopack copies the source of `new Worker(new URL("./ark.worker.ts", …))`
 * as an asset instead of bundling it, so the live type() line's worker is
 * bundled here when the config loads and served from public/.
 */
export const writeLiveWorker = () =>
	buildSync({
		entryPoints: [join(docsDir, "components", "home", "ark.worker.ts")],
		outfile: join(publicDir, liveWorkerUrl),
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		minify: true,
		logLevel: "warning"
	})
