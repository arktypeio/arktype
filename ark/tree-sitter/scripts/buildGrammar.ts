// Regenerates src/ from grammar.js, rebuilds tree-sitter-arktype.wasm and
// records what they were built from, which the tests check is still current.
//
//   pnpm --filter tree-sitter-arktype buildGrammar
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { formatFor } from "@ark/editor-conformance/format.ts"
import { grammarSourceHash, stampPath } from "./stamp.ts"

const root = fileURLToPath(new URL("../", import.meta.url))
const cli = fileURLToPath(
	new URL("../node_modules/tree-sitter-cli/cli.js", import.meta.url)
)
const run = (...args: string[]) =>
	execFileSync(process.execPath, [cli, ...args], {
		cwd: root,
		stdio: "inherit"
	})

run("generate")
// so pnpm checkPrettier passes on what generate writes
for (const file of ["src/grammar.json", "src/node-types.json"]) {
	const url = new URL(`../${file}`, import.meta.url)
	writeFileSync(url, await formatFor(url, readFileSync(url, "utf8")))
}
run("build", "--wasm", "-o", "tree-sitter-arktype.wasm")
writeFileSync(stampPath, `${grammarSourceHash()}\n`)
console.log("built src/ and tree-sitter-arktype.wasm")
