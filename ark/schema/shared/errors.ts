import { ReadonlyArray, type extend, type propwiseXor } from "@arktype/util"
import type { Declaration, Inner, NormalizedSchema, Schema } from "../kinds.js"
import type { TraversalContext } from "./context.js"
import type { PrimitiveKind } from "./define.js"

export class ArkError extends TypeError {}

export class ArkTypeError<code extends ErrorCode = ErrorCode> extends ArkError {
	public message: string
	declare requirement: string
	declare contextualMessage: string

	constructor(
		public path: string[],
		public rule: string
	) {
		const message = path.length
			? `${path.join(".")} must be ${rule}`
			: `Must be ${rule}`
		super(message)
		this.message = message
	}

	toString() {
		return this.contextualMessage
	}

	throw(): never {
		throw this
	}
}

export class ArkErrors extends ReadonlyArray<ArkTypeError> {
	constructor(protected context: TraversalContext) {
		super()
	}

	byPath: Record<string, ArkTypeError> = {}
	count = 0

	// mustBe(mustBe: string, data: unknown, path: Path) {
	// 	return this.addProblem("custom", mustBe, data, path)
	// }

	// addProblem<code extends ProblemCode>(
	// 	code: code,
	// 	...args: ProblemParameters<code>
	// ) {
	// 	// TODO: fix
	// 	const problem = new errorsByCode[code](
	// 		...(args as never[])
	// 	) as any as Problem
	// 	return this.errors.add(problem)
	// }

	add(description: string) {
		const problem = new ArkTypeError([...this.context.path], description)
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
		throw new ArkError(`${this}`, { cause: this })
	}
}

type RequirementInputsByCode = extend<
	{
		[code in PrimitiveKind]: Schema<code>
	},
	{
		missingKey: string | symbol
		extraneousKey: string | symbol
	}
>

type RequirementsByCode = extend<
	{
		[code in PrimitiveKind]: NormalizedSchema<code>
	},
	{
		missingKey: {
			key: string | symbol
		}
		extraneousKey: {
			key: string | symbol
		}
	}
>

export type PrimitiveErrorCode = keyof RequirementsByCode

export type ErrorCode = PrimitiveErrorCode | "union" | "intersection"

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>
