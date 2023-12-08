import type { arraySubclassToReadonly, propwiseXor } from "@arktype/util"

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
		public description: string
	) {
		this.message = path.length
			? `${path.join(".")} must be ${description}`
			: `Must be ${description}`
	}

	toString() {
		return this.message
	}
}

class ProblemsArray extends Array<Problem> {
	currentPath: string[] = []
	byPath: Record<string, Problem> = {}
	count = 0

	add(description: string) {
		const problem = new Problem([...this.currentPath], description)
		const pathKey = this.currentPath.join(".")
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
			this.push(problem)
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

export const Problems: new () => Problems = ProblemsArray

// TODO: fix
export type ProblemCode = string

export type CheckResult<out = unknown> = propwiseXor<
	{ out: out },
	{ problems: Problems }
>

export type Problems = arraySubclassToReadonly<ProblemsArray>
