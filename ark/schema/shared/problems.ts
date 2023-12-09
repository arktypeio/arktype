import type { propwiseXor } from "@arktype/util"
import type { TraversalContext } from "./context.js"

export class ArkTypeError extends TypeError {
	override cause: Problems

	constructor(problems: Problems) {
		super(`${problems}`)
		this.cause = problems
	}
}

export class Problem<data = unknown> {
	public message: string

	constructor(
		public path: string[],
		public rule: string
	) {
		this.message = path.length
			? `${path.join(".")} must be ${rule}`
			: `Must be ${rule}`
	}

	toString() {
		return this.message
	}
}

const ReadonlyArray = Array as new <T>(
	...args: ConstructorParameters<typeof Array>
) => ReadonlyArray<T>

export class Problems extends ReadonlyArray<Problem> {
	// TODO: add at custom path

	constructor(protected context: TraversalContext) {
		super()
	}

	byPath: Record<string, Problem> = {}
	count = 0

	// mustBe(mustBe: string, data: unknown, path: Path) {
	// 	return this.addProblem("custom", mustBe, data, path)
	// }

	// addProblem<code extends ProblemCode>(
	// 	code: code,
	// 	...args: ProblemParameters<code>
	// ) {
	// 	// TODO: fix
	// 	const problem = new problemsByCode[code](
	// 		...(args as never[])
	// 	) as any as Problem
	// 	return this.problems.add(problem)
	// }

	add(description: string) {
		const problem = new Problem([...this.context.path], description)
		const pathKey = this.context.path.join(".")
		const existing = this.byPath[pathKey]
		if (existing) {
			// if (existing.hasCode("intersection")) {
			// 	existing.rule.push(problem)
			// } else {
			// 	const problemIntersection = new ProblemIntersection(
			// 		[existing, problem],
			// 		problem.data,
			// 		problem.path
			// 	)
			// 	const existingIndex = this.indexOf(existing)
			// 	// If existing is found (which it always should be unless this was externally mutated),
			// 	// replace it with the new problem intersection. In case it isn't for whatever reason,
			// 	// just append the intersection.
			// 	this[existingIndex === -1 ? this.length : existingIndex] =
			// 		problemIntersection
			// 	this.byPath[pathKey] = problemIntersection
			// }
		} else {
			this.byPath[pathKey] = problem
			;(this as any).push(problem)
		}
		this.count++
		return problem
	}

	get summary() {
		return this.toString()
	}

	toString() {
		return this.join("\n")
	}

	throw(): never {
		throw new ArkTypeError(this)
	}
}

// TODO: fix
export type ProblemCode = string

export type CheckResult<out = unknown> = propwiseXor<
	{ out: out },
	{ problems: Problems }
>
