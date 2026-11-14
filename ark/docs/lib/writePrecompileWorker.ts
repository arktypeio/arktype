import { runtimeReachesOf } from "@ark/aot/internal/runtimeSize.ts"
import { buildSync } from "esbuild"
import { join } from "node:path"
import {
	precompileWorkerUrl,
	type PrecompileRuntime
} from "../components/playground/precompiledState.ts"
import { docsDir, publicDir } from "./content/paths.ts"

const exportsPattern = /^export {([^}]*)};\n$/m

// arktype/runtime as a bundler resolves it for the browser, in one module
const bundleRuntime = (): Pick<
	PrecompileRuntime,
	"code" | "localsByExport"
> => {
	const [{ text }] = buildSync({
		stdin: {
			contents: `export * from "arktype/runtime"`,
			resolveDir: docsDir
		},
		bundle: true,
		format: "esm",
		platform: "browser",
		write: false,
		logLevel: "warning"
	}).outputFiles
	const exported = exportsPattern.exec(text)
	if (!exported) throw new Error("arktype/runtime bundled without exports")
	const localsByExport: Record<string, string> = {}
	for (const specifier of exported[1].split(",")) {
		const [local, name = local] = specifier.trim().split(/\s+as\s+/)
		if (local) localsByExport[name] = local
	}
	return { code: text.replace(exportsPattern, ""), localsByExport }
}

/**
 * Bundles the playground's Precompiled tab's measuring worker, with the
 * runtime it tree-shakes and what @ark/aot counts of it to choose as a size
 * build does, which reads the runtime's files.
 */
export const writePrecompileWorker = () => {
	const bundled = bundleRuntime()
	const precompileRuntime: PrecompileRuntime = {
		...bundled,
		...runtimeReachesOf(Object.keys(bundled.localsByExport))
	}
	buildSync({
		entryPoints: [
			join(docsDir, "components", "playground", "precompile.worker.ts")
		],
		outfile: join(publicDir, precompileWorkerUrl),
		bundle: true,
		format: "esm",
		platform: "browser",
		target: "es2022",
		minify: true,
		define: { precompileRuntime: JSON.stringify(precompileRuntime) },
		logLevel: "warning"
	})
}
