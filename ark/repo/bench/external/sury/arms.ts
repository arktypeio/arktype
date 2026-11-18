// writes out/sury-arms.json: every case of bundle.ts's two bundles, as arms
// count.ts runs through child.ts
// SURY_NODE=<node> node sury/arms.ts
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Arm } from "../arms.ts"

const here = import.meta.dirname
const node = process.env.SURY_NODE ?? process.execPath
const count: Record<string, Arm> = {}
for (const bundle of ["cases", "arktype"]) {
	const path = join(here, "out", `${bundle}.mjs`)
	const { cases } = await import(path)
	for (const key of Object.keys(cases)) {
		count[`sury ${key}`] = {
			cwd: here,
			node,
			args: [join(here, "child.ts"), path, key]
		}
	}
}
mkdirSync(join(here, "..", "out"), { recursive: true })
writeFileSync(
	join(here, "..", "out", "sury-arms.json"),
	`${JSON.stringify({ count }, null, "\t")}\n`
)
