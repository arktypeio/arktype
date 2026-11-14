// run `pnpm build` first to bundle arktype's build

import { flatMorph } from "@ark/util"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import {
	bundle,
	hasApp,
	sizedLibraries,
	sizedScenarios,
	type Bundle
} from "./bundle.ts"
import { standingOf } from "./stats.ts"

// typia's validators come from `pnpm benchTypia`, whose first run takes minutes
const libraries = sizedLibraries.filter(
	library =>
		library !== "typia" || existsSync(join(import.meta.dirname, "out", "typia"))
)

if (libraries.length < sizedLibraries.length)
	console.log("typia skipped: run `pnpm benchTypia` to size it")

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
// benchData.json's size: bytes by app, then library
const byApp: Record<string, Record<string, { min: number; gzip: number }>> = {}

for (const scenario of sizedScenarios) {
	for (const library of libraries.filter(library =>
		hasApp(scenario, library)
	)) {
		const result = await bundle(scenario, library)
		const min = result.js.length
		const gzip = gzipSync(result.js).length
		sizes[`${scenario} (${library})`] = { "min (B)": min, "gzip (B)": gzip }
		byApp[scenario] ??= {}
		byApp[scenario][library] = { min, gzip }
		if (library === "standalone" || library === "standaloneSmallest") {
			standaloneSplit[`${scenario} (${library})`] = flatMorph(
				bytesByOrigin(result),
				(origin, bytes) => [`${origin} (B min)`, bytes]
			)
		}
	}
}

const out = join(import.meta.dirname, "out")
mkdirSync(out, { recursive: true })
writeFileSync(join(out, "size.json"), JSON.stringify(byApp))

console.table(sizes)
console.table(standaloneSplit)

console.log("size standings, bytes")
console.table(
	Object.fromEntries(
		sizedScenarios.flatMap(scenario =>
			(["gzip", "min"] as const).map(metric => [
				`${scenario} ${metric}`,
				standingOf(
					Object.fromEntries(
						libraries
							.filter(library => hasApp(scenario, library))
							.map(library => [
								library,
								[sizes[`${scenario} (${library})`][`${metric} (B)`]]
							])
					),
					String
				)
			])
		)
	)
)
