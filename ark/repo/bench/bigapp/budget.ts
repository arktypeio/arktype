// Fails when a generated app's precompiled production bundle, minified and
// gzipped, grows past budget.json. Needs a build, not the network. Lower a budget
// as size work lands, never raise one to pass: a raise is a decision about the
// release's claims.
import { mkdirSync, readFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { writeApp } from "./apps.ts"
import { bundle } from "./bundle.ts"

const here = import.meta.dirname
const budgets: { narrows: Record<string, number> } = JSON.parse(
	readFileSync(join(here, "budget.json"), "utf8")
)
const out = join(here, "out", "budget")
mkdirSync(out, { recursive: true })

let failed = false
const check = (name: string, code: string, budget: number) => {
	const actual = gzipSync(code).length
	if (actual > budget) failed = true
	console[actual > budget ? "error" : "log"](
		`${name}: precompiled min gz ${actual} B, budget ${budget} B${actual > budget ? `, past it by ${actual - budget} B` : ""}`
	)
}

for (const [types, budget] of Object.entries(budgets.narrows)) {
	const dir = join(out, types)
	const entry = writeApp(Number(types), "arktype", true, dir)
	check(
		`${types} Types with narrows`,
		await bundle({ entry, cwd: dir, precompiled: {}, minify: true }),
		budget
	)
}
rmSync(out, { recursive: true, force: true })

if (failed) process.exit(1)
