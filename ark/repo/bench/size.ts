// run `pnpm build` first to bundle arktype's build

import { flatMorph } from "@ark/util"
import { gzipSync } from "node:zlib"
import { bundle, libraries, scenarios, type Bundle } from "./bundle.ts"

const bytesByOrigin = ({ metafile }: Bundle) => {
	const result = { runtime: 0, artifacts: 0, app: 0 }
	for (const output of Object.values(metafile.outputs)) {
		for (const [path, { bytesInOutput }] of Object.entries(output.inputs)) {
			const origin =
				path.includes("~arktype/") ? "artifacts"
				: path.includes("apps/") ? "app"
				: "runtime"
			result[origin] += bytesInOutput
		}
	}
	return result
}

const sizes: Record<string, Record<string, number>> = {}
const standaloneSplit: Record<string, Record<string, number>> = {}

for (const scenario of scenarios) {
	for (const library of libraries) {
		const result = await bundle(scenario, library)
		sizes[`${scenario} (${library})`] = {
			"min (B)": result.js.length,
			"gzip (B)": gzipSync(result.js).length
		}
		if (library === "standalone") {
			standaloneSplit[scenario] = flatMorph(
				bytesByOrigin(result),
				(origin, bytes) => [`${origin} (B min)`, bytes]
			)
		}
	}
}

console.table(sizes)
console.table(standaloneSplit)
