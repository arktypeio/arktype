// Writes the tree-sitter target's highlighting of the conformance corpus,
// for check.ts or for inspecting by hand.
//
//   node ark/tree-sitter/test/dump.ts <dir> [--precedence first-pattern]
import { mkdirSync, writeFileSync } from "node:fs"
import type { Precedence } from "./layers.ts"
import { runTarget } from "./target.ts"

const args = process.argv.slice(2)
const [dir] = args
if (!dir) {
	console.error(
		"usage: dump.ts <dir> [--precedence last-pattern|first-pattern]"
	)
	process.exit(1)
}
const precedenceIndex = args.indexOf("--precedence")
const { spans, skipped } = await runTarget(
	precedenceIndex === -1 ?
		{}
	:	{ precedence: args[precedenceIndex + 1] as Precedence }
)
mkdirSync(dir, { recursive: true })
for (const [fixture, fixtureSpans] of spans) {
	writeFileSync(
		`${dir}/${fixture}.json`,
		`${JSON.stringify({ source: `corpus/${fixture}`, spans: fixtureSpans }, null, "\t")}\n`
	)
}
console.log(
	`wrote ${spans.size} fixtures to ${dir}${skipped.length ? `; no host grammar for ${skipped.join(", ")}` : ""}`
)
