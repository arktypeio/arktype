// Compares Neovim's highlight dump with the reference tree-sitter target's
// (ark/tree-sitter/test/dump.ts): the same grammar and queries under plain
// tree-sitter, so any character they color differently is a Neovim layering
// effect, and fails the suite.
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

export const formatReferenceDifference = (d: ReferenceDifference): string =>
	`${d.fixture}:${d.line + 1}:${d.column + 1} ${JSON.stringify(d.text)} neovim ${d.neovim}, tree-sitter ${d.reference}`
