// Compares Neovim's highlight dump with the reference tree-sitter target's
// (ark/tree-sitter/test/dump.ts): the same grammar and queries under plain
// tree-sitter, so any character they color differently is a Neovim layering
// effect. Every such run must be listed, with a reason, in
// referenceDifferences.json.
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

type Span = {
	line: number
	column: number
	length: number
	text: string
	category: string
}

export type ReferenceDifference = {
	fixture: string
	line: number
	column: number
	text: string
	neovim: string
	reference: string
	reason?: string
}

const charMap = (spans: Span[]) => {
	const map = new Map<string, { category: string; char: string }>()
	for (const span of spans) {
		for (let i = 0; i < span.length; i++) {
			map.set(`${span.line}:${span.column + i}`, {
				category: span.category,
				char: span.text[i] ?? ""
			})
		}
	}
	return map
}

const readSpans = (file: string): Span[] =>
	JSON.parse(readFileSync(file, "utf8")).spans

export const compareReference = (
	neovimDir: string,
	referenceDir: string
): ReferenceDifference[] => {
	const differences: ReferenceDifference[] = []
	for (const file of readdirSync(referenceDir).sort()) {
		if (!file.endsWith(".json")) continue
		const fixture = file.replace(/\.json$/, "")
		const neovimFile = join(neovimDir, file)
		const reference = charMap(readSpans(join(referenceDir, file)))
		const neovim =
			existsSync(neovimFile) ? charMap(readSpans(neovimFile)) : new Map()
		const keys = [...new Set([...reference.keys(), ...neovim.keys()])]
		const chars = keys
			.map(key => {
				const [line, column] = key.split(":").map(Number)
				return {
					line,
					column,
					text: reference.get(key)?.char ?? neovim.get(key)?.char ?? "",
					neovim: neovim.get(key)?.category ?? "(host)",
					reference: reference.get(key)?.category ?? "(host)"
				}
			})
			.filter(char => char.neovim !== char.reference)
			.sort((a, b) => a.line - b.line || a.column - b.column)
		for (const char of chars) {
			const last = differences[differences.length - 1]
			if (
				last?.fixture === fixture &&
				last.line === char.line &&
				last.column + last.text.length === char.column &&
				last.neovim === char.neovim &&
				last.reference === char.reference
			)
				last.text += char.text
			else differences.push({ fixture, ...char })
		}
	}
	return differences
}

const key = (d: ReferenceDifference) =>
	`${d.fixture}:${d.line}:${d.column}:${d.text}:${d.neovim}:${d.reference}`

/** Prints unlisted and stale differences; returns whether none are. */
export const reportReference = (
	differences: ReferenceDifference[],
	listedFile: string
): boolean => {
	const listed: ReferenceDifference[] =
		existsSync(listedFile) ? JSON.parse(readFileSync(listedFile, "utf8")) : []
	const listedKeys = new Set(listed.map(key))
	const found = new Set(differences.map(key))
	const unexpected = differences.filter(d => !listedKeys.has(key(d)))
	const stale = listed.filter(d => !found.has(key(d)))
	const format = (d: ReferenceDifference) =>
		`${d.fixture}:${d.line + 1}:${d.column + 1} ${JSON.stringify(d.text)} neovim ${d.neovim}, tree-sitter ${d.reference}`
	for (const d of unexpected) console.error(`unexpected: ${format(d)}`)
	for (const d of stale)
		console.error(`stale (no longer differs): ${format(d)}`)
	console.log(
		`neovim vs tree-sitter: ${differences.length} known differences, ${unexpected.length} unexpected, ${stale.length} stale`
	)
	return unexpected.length === 0 && stale.length === 0
}
