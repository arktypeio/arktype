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
	private lineStarts: number[] | undefined
	// where a tool that transpiled the source before the build maps its lines
	private mappings: SourceMapMappings | undefined

	constructor(id: string, source: string, path: string, mappings?: string) {
		this.id = id
		this.path = path
		this.source = source
		this.mappings = mappings ? decode(mappings) : undefined
		let result = parse(id, source, langOf(id))
		// Next and other tools allow JSX in a .js module
		if (result.errors.length && id.endsWith(".js")) {
			const jsx = parse(id, source, "jsx")
			if (!jsx.errors.length) result = jsx
		}
		this.program = result.program
		this.parseErrors = result.errors.map(e => e.message)
		this.scopes = new ModuleScopes(this.program)
		this.islands =
			source.includes(islandMarker) ?
				islandsOf(this.program, source, result.comments, this.strayMarkers)
			:	[]
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

// oxc's raw transfer reads a tree several times faster than its JSON, through
// a buffer reserving 6 GiB of address space, which Windows commits
let readsRaw = process.platform !== "win32" && rawTransferSupported()

export const parseCode = (
	id: string,
	source: string,
	options: ParserOptions
): ParseResult => {
	if (readsRaw) {
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

const islandsOf = (
	program: Program,
	source: string,
	comments: Comment[],
	strays: Comment[]
): Node[] => {
	const result: Node[] = []
	const whitespace = /\s*/y
	for (let i = 0; i < comments.length; i++) {
		const comment = comments[i]
		if (comment.type !== "Line" || comment.value.trim() !== islandMarker)
			continue
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
		if (island) result.push(island)
		else strays.push(comment)
	}
	return result
}

const computeLineStarts = (source: string): number[] => {
	const result = [0]
	for (let i = 0; i < source.length; i++)
		if (source[i] === "\n") result.push(i + 1)
	return result
}
