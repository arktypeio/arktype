import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

const root = new URL("../", import.meta.url)

/** What src/ and the .wasm are built from. */
const sources = ["grammar.js", "src/scanner.c"]

export const stampPath = new URL("tree-sitter-arktype.wasm.sha256", root)

/** A hash of the grammar's sources, recorded beside the .wasm when it's built. */
export const grammarSourceHash = (): string => {
	const hash = createHash("sha256")
	for (const source of sources) hash.update(readFileSync(new URL(source, root)))
	return hash.digest("hex")
}

export const isBuildCurrent = (): boolean =>
	readFileSync(stampPath, "utf8").trim() === grammarSourceHash()
