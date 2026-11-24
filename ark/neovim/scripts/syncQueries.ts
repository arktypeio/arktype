// Copies the official grammar's queries (ark/tree-sitter/queries) to where
// Neovim looks for them on 'runtimepath':
//
// - queries/arktype/highlights.scm, verbatim
// - queries/ecma/injections.scm, marked `; extends`: nvim-treesitter's
//   typescript and javascript queries inherit `ecma` (and tsx inherits
//   typescript), so one file adds ArkType to all three without replacing
//   their own injections
//
//   node ark/neovim/scripts/syncQueries.ts [--check]
//
// --check exits 1 instead of writing when a copy is out of date.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"

const pluginDir = join(import.meta.dirname, "..")
const grammarDir = join(pluginDir, "..", "tree-sitter")
const check = process.argv.includes("--check")

const header = (source: string) =>
	`; Copied from ark/tree-sitter/${source} by ark/neovim/scripts/syncQueries.ts.\n; Edit that file, then run the script.\n`

const targets = [
	{
		source: "queries/highlights.scm",
		target: "queries/arktype/highlights.scm",
		prefix: ""
	},
	{
		source: "queries/ecma/injections.scm",
		target: "queries/ecma/injections.scm",
		prefix: "; extends\n"
	}
]

let stale = false
for (const { source, target, prefix } of targets) {
	const sourcePath = join(grammarDir, source)
	if (!existsSync(sourcePath)) throw new Error(`missing ${sourcePath}`)
	const content = prefix + header(source) + readFileSync(sourcePath, "utf8")
	const targetPath = join(pluginDir, target)
	const current = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : ""
	if (current === content) continue
	if (check) {
		console.error(
			`${relative(process.cwd(), targetPath)} is out of date; run node ark/neovim/scripts/syncQueries.ts`
		)
		stale = true
		continue
	}
	mkdirSync(dirname(targetPath), { recursive: true })
	writeFileSync(targetPath, content)
	console.log(`wrote ${relative(process.cwd(), targetPath)}`)
}
if (stale) process.exit(1)
