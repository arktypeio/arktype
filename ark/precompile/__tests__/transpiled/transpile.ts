import { transformSync } from "esbuild"
import { readFileSync } from "node:fs"
import type { LoadHook } from "node:module"
import { fileURLToPath } from "node:url"

export const load: LoadHook = (url, context, nextLoad) => {
	if (!url.startsWith(new URL(".", import.meta.url).href))
		return nextLoad(url, context)
	const { code } = transformSync(readFileSync(fileURLToPath(url), "utf8"), {
		loader: "ts",
		format: "esm",
		minifyWhitespace: true,
		keepNames: true
	})
	return { format: "module", source: code, shortCircuit: true }
}
