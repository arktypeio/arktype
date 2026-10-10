import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"

registerHooks({
	load: (url, context, nextLoad) =>
		url.startsWith(new URL(".", import.meta.url).href) ?
			{
				format: "module-typescript",
				source: readFileSync(fileURLToPath(url), "utf8"),
				shortCircuit: true
			}
		:	nextLoad(url, context)
})
