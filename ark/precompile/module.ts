import { parseSync, type Node, type Program } from "oxc-parser"
import { ModuleScopes } from "./scope.ts"

export class SourceModule {
	id: string
	source: string
	program: Program
	scopes: ModuleScopes
	parseErrors: string[]
	private lineStarts: number[] | undefined

	constructor(id: string, source: string) {
		this.id = id
		this.source = source
		const result = parseSync(id, source, {
			lang: langOf(id),
			sourceType: "module",
			preserveParens: false
		})
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

	positionOf(node: Node): string {
		const [line, column] = this.lineAndColumnOf(node.start)
		return `${this.id}:${line}:${column}`
	}

	textOf(node: Node): string {
		return this.source.slice(node.start, node.end)
	}

	snippetOf(node: Node): string {
		const text = this.textOf(node).replace(/\s*\n\s*/g, " ")
		return text.length > 60 ? `${text.slice(0, 59)}…` : text
	}
}

const langOf = (id: string) =>
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
