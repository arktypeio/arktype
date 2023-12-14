import {
	ReadonlyArray,
	type Dict,
	type evaluate,
	type extend,
	type propwiseXor
} from "@arktype/util"
import type { NormalizedSchema, Prerequisite, Schema } from "../kinds.js"
import type { StaticArkOption } from "../scope.js"
import type { TraversalContext } from "./context.js"
import type { PrimitiveKind } from "./define.js"

export class ArkError extends TypeError {}

export class ArkTypeError<
	code extends ArkErrorCode = ArkErrorCode
> extends ArkError {
	public message: string
	declare requirement: string
	declare contextualMessage: string

	constructor(public context: ArkErrorContext<code>) {
		const message = ""
		// context.path.length
		// 	? `${context.path.join(".")} must be ${rule}`
		// 	: `Must be ${rule}`
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
		const problem = {} as any // new ArkTypeError([...this.context.path], description)
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

export interface KeyErrorDeclaration {
	requirement: {
		key: string | symbol
	}
	schema: this["requirement"] | this["requirement"]["key"]
	data: object
}

export interface CompositeErrorDeclaration {
	requirement: {
		errors: readonly ArkError[]
	}
	schema: this["requirement"] | this["requirement"]["errors"]
	data: unknown
}

type ArkErrorDeclarationsByCode = evaluate<
	{
		[code in PrimitiveKind]: {
			schema: Schema<code>
			requirement: NormalizedSchema<code>
			data: Prerequisite<code>
		}
	} & {
		missingKey: KeyErrorDeclaration
		extraneousKey: KeyErrorDeclaration
		intersection: CompositeErrorDeclaration
		union: CompositeErrorDeclaration
	} & StaticArkOption<"errors">
>

export type ArkErrorCode = keyof ArkErrorDeclarationsByCode

export type ArkErrorSchema<code extends ArkErrorCode> =
	ArkErrorDeclarationsByCode[code]["schema"]

export type ArkErrorRequirement<code extends ArkErrorCode> =
	ArkErrorDeclarationsByCode[code]["requirement"]

export type ArkErrorData<code extends ArkErrorCode> =
	ArkErrorDeclarationsByCode[code]["data"]

export type ArkErrorInput<code extends ArkErrorCode = ArkErrorCode> = extend<
	{
		code: code
		path?: readonly (string | symbol)[]
		data: ArkErrorData<code>
	},
	ArkErrorRequirement<code>
>

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> = extend<
	{
		code: code
		path: readonly (string | symbol)[]
		data: ArkErrorData<code>
	},
	ArkErrorRequirement<code>
>

export type ArkErrorDeclaration = {
	schema: unknown
	requirement: Dict
	data: unknown
}

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>
