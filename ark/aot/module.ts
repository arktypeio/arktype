import {
	parseSync,
	rawTransferSupported,
	type Comment,
	type Node,
	type ParseResult,
	type ParserOptions,
	type Program,
	type Span
} from "oxc-parser"
import {
	decode,
	type SourceMapMappings,
	type SourceMapSegment
} from "@jridgewell/sourcemap-codec"
import { ModuleScopes, walk } from "./scope.ts"
import { markedStrategyOf, strategyMarker } from "./strategies.ts"

export const allowDropNarrowMarker = "@ark-allow-drop-narrow"

export interface DropNarrowSuppressions {
	// AST nodes preceded by `// @ark-allow-drop-narrow`
	nodes: Node[]
	// 1-based line numbers of the token after a leading `// @ark-allow-drop-narrow`
	leadingLines: Set<number>
	// 1-based line numbers of a trailing `// @ark-allow-drop-narrow` on a line with code
	trailingLines: Set<number>
}

const emptyLineSet = new Set<number>()
const emptySuppressions: DropNarrowSuppressions = {
	nodes: [],
	leadingLines: emptyLineSet,
	trailingLines: emptyLineSet
}

export class SourceModule {
	id: string
	// the id as messages print it
	path: string
	source: string
	program: Program
	scopes: ModuleScopes
	parseErrors: string[]
	// nodes a `// @ark-runtime` comment leads, whose sites run on arktype
	islands: Node[]
	// markers no node follows
	strayMarkers: Comment[] = []
	// nodes a `// @ark-strategy <name>` comment leads, with the name
	strategyMarks: StrategyMark[]
	strayStrategyMarkers: Comment[] = []
	// `// @ark-allow-drop-narrow` suppressions in this module
	allowDropNarrows: DropNarrowSuppressions
	private lineStarts: number[] | undefined
	// where a tool that transpiled the source before the build maps its lines
	private mappings: SourceMapMappings | undefined

	constructor(id: string, source: string, path: string, mappings?: string) {
		this.id = id
		this.path = path
		this.source = source
		this.mappings = mappings ? decode(mappings) : undefined
		const result = parseModule(id, source)
		this.program = result.program
		this.parseErrors = result.errors.map(e => e.message)
		this.scopes = new ModuleScopes(this.program)
		this.islands =
			source.includes(islandMarker) ?
				markedBy(
					this.program,
					source,
					result.comments,
					this.strayMarkers,
					// what follows it is a reason, as `// @ark-runtime its shape is loaded`
					comment => comment.split(/\s/, 1)[0] === islandMarker || undefined
				).map(([node]) => node)
			:	[]
		this.strategyMarks =
			source.includes(strategyMarker) ?
				markedBy(
					this.program,
					source,
					result.comments,
					this.strayStrategyMarkers,
					markedStrategyOf
				).map(([node, name, comment]) => ({ node, name, comment }))
			:	[]
		this.allowDropNarrows =
			source.includes(allowDropNarrowMarker) ?
				dropNarrowSuppressionsOf(
					this.program,
					source,
					result.comments,
					offset => this.lineAndColumnOf(offset)[0]
				)
			:	emptySuppressions
	}

	lineAndColumnOf(offset: number): [line: number, column: number] {
		this.lineStarts ??= computeLineStarts(this.source)
		let low = 0
		let high = this.lineStarts.length - 1
		while (low < high) {
			const mid = (low + high + 1) >> 1
			if (this.lineStarts[mid] <= offset) low = mid
			else high = mid - 1
		}
		const column = offset - this.lineStarts[low]
		// the last segment starting at or before the column, sorted by column
		let mapped: SourceMapSegment | undefined
		for (const segment of this.mappings?.[low] ?? []) {
			if (segment[0] > column) break
			if (segment.length > 1) mapped = segment
		}
		return mapped ?
				[mapped[2]! + 1, mapped[3]! + column - mapped[0] + 1]
			:	[low + 1, column + 1]
	}

	positionOf(span: Span): string {
		const [line, column] = this.lineAndColumnOf(span.start)
		return `${this.path}:${line}:${column}`
	}

	textOf(span: Span): string {
		return this.source.slice(span.start, span.end)
	}

	snippetOf(span: Span): string {
		const text = this.textOf(span).replace(/\s*\n\s*/g, " ")
		return text.length > 60 ? `${text.slice(0, 59)}…` : text
	}
}

const parse = (id: string, source: string, lang: Lang) =>
	parseCode(id, source, {
		lang,
		sourceType: /\.c[jt]s$/.test(id) ? "commonjs" : "module",
		preserveParens: false
	})

// a module's tree, read in the language its id names
export const parseModule = (id: string, source: string): ParseResult => {
	const result = parse(id, source, langOf(id))
	// Next and other tools allow JSX in a .js module
	if (result.errors.length && id.endsWith(".js")) {
		const jsx = parse(id, source, "jsx")
		if (!jsx.errors.length) return jsx
	}
	return result
}

// oxc's raw transfer reads a tree several times faster than its JSON, through
// a buffer reserving 6 GiB of address space, which Windows commits
let readsRaw = process.platform !== "win32" && rawTransferSupported()

// Raw transfer ends the process, with a panic nothing here can catch ("out of
// memory" in oxc_allocator), on a module of several thousand import
// declarations: in oxc-parser 0.153.0, 4,500 are read and 5,000 aren't,
// whatever they import. A module of 2,000 definitions a default build wrote
// imports about 6,000 units, each on a line of its own. Its tree is read as
// JSON, which reads any number: this many mentions of `import` is well under
// what fails, and a text too short to hold them isn't searched
const maxRawImports = 2048

const importsWithinRaw = (source: string): boolean => {
	// `import"a";`, the shortest there is
	if (source.length < maxRawImports * 10) return true
	let mentions = 0
	for (
		let at = source.indexOf("import");
		at !== -1;
		at = source.indexOf("import", at + 6)
	)
		if (++mentions > maxRawImports) return false
	return true
}

export const parseCode = (
	id: string,
	source: string,
	options: ParserOptions
): ParseResult => {
	if (readsRaw && importsWithinRaw(source)) {
		try {
			return parseSync(id, source, {
				...options,
				experimentalRawTransfer: true
			} as ParserOptions)
		} catch (e) {
			// a process that can't reserve the buffer reads JSON
			if (!(e instanceof RangeError)) throw e
			readsRaw = false
		}
	}
	return parseSync(id, source, options)
}

type Lang = "js" | "jsx" | "ts" | "tsx"

export const langOf = (id: string): Lang =>
	/\.[cm]?tsx$/.test(id) ? "tsx"
	: /\.[cm]?ts$/.test(id) ? "ts"
	: /\.jsx$/.test(id) ? "jsx"
	: "js"

const islandMarker = "@ark-runtime"

export interface StrategyMark {
	node: Node
	// what follows the marker, which may name no strategy
	name: string
	comment: Comment
}

// each node a line comment a marker reads leads, with what it read of it
const markedBy = <read>(
	program: Program,
	source: string,
	comments: Comment[],
	strays: Comment[],
	readMarker: (comment: string) => read | undefined
): [node: Node, read: read, comment: Comment][] => {
	const result: [node: Node, read: read, comment: Comment][] = []
	const whitespace = /\s*/y
	for (let i = 0; i < comments.length; i++) {
		const comment = comments[i]
		const read =
			comment.type === "Line" ? readMarker(comment.value.trim()) : undefined
		if (read === undefined) continue
		let start = comment.end
		for (let j = i + 1; ; j++) {
			whitespace.lastIndex = start
			start += whitespace.exec(source)![0].length
			if (comments[j]?.start !== start) break
			start = comments[j].end
		}
		let island: Node | undefined
		// the outermost node starting where the comment's next token does
		walk(program, node => {
			if (island) return false
			if (node.start === start && node.type !== "Program") island = node
			return !island && node.start <= start && start < node.end
		})
		if (island) result.push([island, read, comment])
		else strays.push(comment)
	}
	return result
}

const dropNarrowSuppressionsOf = (
	program: Program,
	source: string,
	comments: Comment[],
	lineOf: (offset: number) => number
): DropNarrowSuppressions => {
	const nodes: Node[] = []
	const leadingLines = new Set<number>()
	const trailingLines = new Set<number>()
	const whitespace = /\s*/y
	for (let i = 0; i < comments.length; i++) {
		const comment = comments[i]
		if (
			comment.type !== "Line" ||
			comment.value.trim().split(/\s/, 1)[0] !== allowDropNarrowMarker
		)
			continue
		const lineStart = source.lastIndexOf("\n", comment.start - 1) + 1
		if (source.slice(lineStart, comment.start).trim().length > 0) {
			trailingLines.add(lineOf(comment.start))
			continue
		}
		let start = comment.end
		for (let j = i + 1; ; j++) {
			whitespace.lastIndex = start
			start += whitespace.exec(source)![0].length
			if (comments[j]?.start !== start) break
			start = comments[j].end
		}
		let marked: Node | undefined
		walk(program, node => {
			if (marked) return false
			if (node.start === start && node.type !== "Program") marked = node
			return !marked && node.start <= start && start < node.end
		})
		if (marked) nodes.push(marked)
		else if (
			source[start] === "." ||
			source.startsWith("?.", start) ||
			source[start] === "["
		)
			leadingLines.add(lineOf(start))
	}
	return { nodes, leadingLines, trailingLines }
}

const computeLineStarts = (source: string): number[] => {
	const result = [0]
	for (let i = 0; i < source.length; i++)
		if (source[i] === "\n") result.push(i + 1)
	return result
}
