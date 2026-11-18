// writes out/ata-arms.json: every scene, body and library of ata's
// validator-benchmarks that runs (impls.patch applied, so ArkType's adapter is
// one of them), each an arm count.ts runs through child.ts, which fails where
// an adapter disagrees with the scene on a document; a blocked scene's
// process refuses code generation from strings, as run.mjs's does. count.ts
// needs ATA_RACE_COMPILED and ARK_VALIDATORS set as here
// ATA=<clone> ATA_RACE_COMPILED=<dir> ARK_VALIDATORS=<out/validators.js> ATA_NODE=<node> node ata/arms.ts
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { scenes } from "./scenes.ts"
import type { Arm } from "../arms.ts"

const ata = process.env.ATA!
const node = process.env.ATA_NODE ?? process.execPath
const here = import.meta.dirname
const load = (path: string) => import(pathToFileURL(join(ata, path)).href)
const { bodies } = await load("bodies/index.mjs")
const { libs, make } = await load("impls/index.mjs")

const count: Record<string, Arm> = {}
for (const [sceneName, sc] of Object.entries(scenes)) {
	for (const bodyName of Object.keys(bodies)) {
		for (const lib of Object.keys(libs)) {
			// a library that generates code runs only where code generation is allowed
			if (sc.blocked && !libs[lib].blocked) continue
			if (!(await make(lib, bodies[bodyName], sc.scene))) continue
			const args = [
				...(sc.blocked ? ["--disallow-code-generation-from-strings"] : []),
				join(here, "child.ts"),
				ata,
				sceneName,
				bodyName,
				lib
			]
			count[`ata ${sceneName}|${bodyName}|${lib}`] = { cwd: here, node, args }
		}
	}
}
mkdirSync(join(here, "..", "out"), { recursive: true })
writeFileSync(
	join(here, "..", "out", "ata-arms.json"),
	`${JSON.stringify({ count }, null, "\t")}\n`
)
console.log(Object.keys(count).length)
