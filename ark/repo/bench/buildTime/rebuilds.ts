// run from an app's directory by measure.ts: an esbuild context's first
// build, then its rebuild after each edit, as JSON on the last line
// usage: node rebuilds.ts <edits> <development|production>
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { editedCommon } from "./apps.ts"

const edits = Number(process.argv[2])
const development = process.argv[3] === "development"
const app = process.cwd()
process.argv[2] = "--context"
const { options, context } = await import(join(app, "esbuild.ts"))
const common = join(app, "src/domains/d0/common.ts")
const original = readFileSync(common, "utf8")
// a watch loop's options, without the production condition
const ctx = await context(
	development ? { ...options, conditions: [], minify: false } : options
)
let start = performance.now()
await ctx.rebuild()
const ms = performance.now() - start
const rebuilds: number[] = []
try {
	for (let i = 1; i <= edits; i++) {
		writeFileSync(common, editedCommon(original, i))
		start = performance.now()
		const result = await ctx.rebuild()
		if (result.errors.length) throw new Error(JSON.stringify(result.errors))
		rebuilds.push(performance.now() - start)
	}
} finally {
	writeFileSync(common, original)
	await ctx.dispose()
}
console.log(JSON.stringify({ ms, rebuilds }))
