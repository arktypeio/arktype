// loaded via --import so code importing "typescript" gets TS 6 from attest's
// typescript-6 alias rather than the workspace's TS 7
import { createRequire, registerHooks } from "node:module"
import { pathToFileURL } from "node:url"

const ts6Url = pathToFileURL(
	createRequire(new URL("../attest/package.json", import.meta.url)).resolve(
		"typescript-6"
	)
).href

registerHooks({
	resolve: (specifier, context, nextResolve) =>
		specifier === "typescript" ?
			{ url: ts6Url, format: "commonjs", shortCircuit: true }
		:	nextResolve(specifier, context)
})
