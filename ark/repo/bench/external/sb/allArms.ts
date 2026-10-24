// writes out/sb-arms.json: every runtime case of every schema-benchmarks
// library (initialization, validation, parsing, Standard Schema, string
// formats and codecs), each an arm count.ts runs through allChild.ts
// SB=<schema-benchmarks clone, schemas built> SB_NODE=<node> node sb/allArms.ts
import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import type { Arm } from "../arms.ts"

const sb = process.env.SB!
const node = process.env.SB_NODE ?? process.execPath
const here = import.meta.dirname
const child = join(here, "allChild.ts")
const { libraries } = await import(
	pathToFileURL(join(sb, "schemas/dist/index.mjs")).href
)

const count: Record<string, Arm> = {}
for (const library of Object.keys(libraries)) {
	const listed = spawnSync(node, [child, sb, library, "list", "1"], {
		encoding: "utf8"
	})
	const keys: string[] = JSON.parse(listed.stdout.trim().split("\n").at(-1)!)
	for (const key of keys)
		count[`sb ${key}`] = { cwd: here, node, args: [child, sb, library, key] }
}
mkdirSync(join(here, "..", "out"), { recursive: true })
writeFileSync(
	join(here, "..", "out", "sb-arms.json"),
	`${JSON.stringify({ count }, null, "\t")}\n`
)
console.log(Object.keys(count).length)
