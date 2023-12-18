import {
	ReadonlyArray,
	type Dict,
	type autocomplete,
	type evaluate,
	type extend,
	type propwiseXor
} from "@arktype/util"
import type { NormalizedSchema, Prerequisite } from "../kinds.js"
import type { StaticArkOption } from "../scope.js"
import type { PrimitiveKind } from "../shared/define.js"
import type { TraversalContext, TraversalPath } from "./context.js"

export class ArkError extends TypeError {}

export class ArkTypeError<
	code extends ArkErrorCode = ArkErrorCode
> extends ArkError {
	constructor(
		public code: code,
		public context: ArkErrorContext<code>,
		public message: string
	) {
		// context.path.length
		// 	? `${context.path.join(".")} must be ${rule}`
		// 	: `Must be ${rule}`
		super(message)
		this.message = message
	}

	toString() {
		return this.message
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

	add<codeOrDescription extends autocomplete<ArkErrorCode>>(
		codeOrDescription: codeOrDescription,
		...schema: codeOrDescription extends ArkErrorCode
			? [schema: ArkErrorContext<codeOrDescription>]
			: []
	) {
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

export interface CustomErrorDeclaration {
	description: string
	data: unknown
}

export interface KeyErrorDeclaration {
	key: string | symbol
	data: object
}

export interface CompositeErrorDeclaration {
	errors: readonly ArkError[]
	data: unknown
}

type deriveErrorSchema<k extends PrimitiveKind> = extend<
	{
		expected: string
		actual: string
		data: Prerequisite<k>
		path: TraversalPath
	},
	Omit<NormalizedSchema<k>, "description">
>

type ArkErrorContextByCode = evaluate<
	{
		[k in PrimitiveKind]: deriveErrorSchema<k>
	} & {
		missingKey: KeyErrorDeclaration
		extraneousKey: KeyErrorDeclaration
		intersection: CompositeErrorDeclaration
		union: CompositeErrorDeclaration
	} & StaticArkOption<"errors">
>

export type ArkErrorCode = keyof ArkErrorContextByCode

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextByCode[code]

export type ArkErrorDeclaration = {
	schema: Dict
	data: unknown
}

export type ErrorsConfig = { [code in ArkErrorCode]: ErrorWriter<code> }

export type ErrorWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: ArkErrorContext<code>
) => string

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>
