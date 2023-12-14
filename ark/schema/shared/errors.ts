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
	declare schema: string
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

	// export type ArkErrorInput<code extends ArkErrorCode = ArkErrorCode> =
	// | ArkErrorSchema<code>
	// | extend<
	// 		{
	// 			code: code
	// 			path?: readonly (string | symbol)[]
	// 		},
	// 		ArkErrorRequirement<code>
	//   >

	add<code extends ArkErrorCode>(
		code: code,
		schema: ArkErrorSchema<code>
	): ArkError
	add(description: string): ArkError
	add(codeOrDescription: string, schema?: ArkErrorSchema) {
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

type BaseErrorSchema = {
	path?: readonly (string | symbol)[]
	description?: string
	message?: string
}

type defineErrorSchema<from> = extend<BaseErrorSchema, from>

export interface CustomErrorDeclaration {
	schema: defineErrorSchema<{
		description: string
	}>
	data: unknown
}

export interface KeyErrorDeclaration {
	schema: defineErrorSchema<{
		key: string | symbol
	}>
	data: object
}

export interface CompositeErrorDeclaration {
	schema: defineErrorSchema<{
		errors: readonly ArkError[]
	}>
	data: unknown
}

type ArkErrorDeclarationsByCode = evaluate<
	{
		[code in PrimitiveKind]: {
			schema: defineErrorSchema<NormalizedSchema<code>>
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

export type ArkErrorSchema<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorDeclarationsByCode[code]["schema"]

export type ArkErrorData<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorDeclarationsByCode[code]["data"]

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> = extend<
	{
		code: code
		path: readonly (string | symbol)[]
		data: ArkErrorData<code>
	},
	ArkErrorSchema<code>
>

export type ArkErrorDeclaration = {
	schema: Dict
	data: unknown
}

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>
