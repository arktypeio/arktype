import { parseSync, type Program, type Span } from "oxc-parser"
import { ModuleScopes } from "./scope.ts"

export class SourceModule {
	id: string
	// the id as messages print it
	path: string
	source: string
	program: Program
	scopes: ModuleScopes
	parseErrors: string[]
	private lineStarts: number[] | undefined

	constructor(id: string, source: string, path: string) {
		this.id = id
		this.path = path
		this.source = source
		let result = parse(id, source, langOf(id))
		// Next and other tools allow JSX in a .js module
		if (result.errors.length && id.endsWith(".js")) {
			const jsx = parse(id, source, "jsx")
			if (!jsx.errors.length) result = jsx
		}
		this.program = result.program
		this.parseErrors = result.errors.map(e => e.message)
		this.scopes = new ModuleScopes(this.program)
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
		return [low + 1, offset - this.lineStarts[low] + 1]
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
	parseSync(id, source, {
		lang,
		sourceType: /\.c[jt]s$/.test(id) ? "commonjs" : "module",
		preserveParens: false
	})

type Lang = "js" | "jsx" | "ts" | "tsx"

const langOf = (id: string): Lang =>
	/\.[cm]?tsx$/.test(id) ? "tsx"
	: /\.[cm]?ts$/.test(id) ? "ts"
	: /\.jsx$/.test(id) ? "jsx"
	: "js"

const computeLineStarts = (source: string): number[] => {
	const result = [0]
	for (let i = 0; i < source.length; i++)
		if (source[i] === "\n") result.push(i + 1)
	return result
}
