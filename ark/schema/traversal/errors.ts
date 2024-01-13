import {
	ReadonlyArray,
	hasDefinedKey,
	type DynamicBase,
	type evaluate,
	type optionalizeKeys,
	type propwiseXor
} from "@arktype/util"
import type { Declaration, Prerequisite } from "../kinds.js"
import type { NodeKind } from "../shared/define.js"
import type { TraversalContext, TraversalPath } from "./context.js"

export class ArkError extends TypeError {
	toString() {
		return this.message
	}

	throw(): never {
		throw this
	}
}

export const ArkTypeError = <context extends ArkErrorContext>(
	context: context
) => Object.assign(new ArkError(context.message), context)

// hasCode<code extends ArkErrorCode>(code: code): this is ArkTypeError<code> {
// 	return this.code === (code as never)
// }

export interface ArkTypeError<code extends ArkErrorCode = ArkErrorCode>
	extends ArkError,
		DynamicBase<ArkErrorContext<code>> {}

export class ArkErrors extends ReadonlyArray<ArkTypeError> {
	constructor(protected ctx: TraversalContext) {
		super()
	}

	byPath: Record<string, ArkTypeError> = {}
	count = 0
	private mutable: ArkTypeError[] = this as never

	add<input extends ArkErrorInput>(
		input: input
	): ArkTypeError<
		input extends { code: ArkErrorCode } ? input["code"] : "predicate"
	>
	add(input: ArkErrorInput) {
		let ctx: ArkErrorContext
		const data = this.ctx.data
		const nodeConfig = this.ctx.config.predicate
		if (typeof input === "string") {
			ctx = {
				code: "predicate",
				path: [...this.ctx.path],
				data,
				actual: nodeConfig.actual(data),
				expected: input
			} satisfies ProblemContext as any
			ctx.problem = nodeConfig.problem(ctx as never)
			ctx.message = nodeConfig.message(ctx as never)
		} else {
			const code = input.code ?? "predicate"
			const nodeConfig = this.ctx.config[code]
			ctx = {
				...input,
				// prioritize these over the raw user provided values so we can
				// check for keys with values like undefined
				code,
				path: input.path ?? [...this.ctx.path],
				data: "data" in input ? input.data : data,
				actual:
					input.actual !== undefined
						? input.actual
						: nodeConfig.actual?.(data as never),
				expected: input.expected ?? nodeConfig.description?.(input as never)
			} satisfies ProblemContext as any
			ctx.problem = hasDefinedKey(input, "problem")
				? input.problem
				: nodeConfig.problem(ctx as never)
			ctx.message = hasDefinedKey(input, "message")
				? input.message
				: nodeConfig.message(ctx as never)
		}

		const pathKey = this.ctx.path.join(".")
		// const existing = this.byPath[pathKey]
		// if (existing) {
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
		// } else {
		const error = ArkTypeError(ctx)
		this.byPath[pathKey] = error
		this.mutable.push(error)
		//}
		this.count++
		return error
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

export interface DerivableErrorContext<data = unknown> {
	expected: string
	actual: string | null
	problem: string
	message: string
	data: data
	path: TraversalPath
}

export type ArkErrorCode = {
	[kind in NodeKind]: Declaration<kind>["errorContext"] extends null
		? never
		: kind
}[NodeKind]

type ErrorContextsByCode = {
	[kind in ArkErrorCode]: Declaration<kind>["errorContext"]
}

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> =
	ErrorContextsByCode[code]

export type MessageContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	ArkErrorContext<code>,
	"message"
>

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	MessageContext<code>,
	"problem"
>

type ErrorInputByCode = {
	[code in ArkErrorCode]: optionalizeKeys<
		ErrorContextsByCode[code],
		keyof DerivableErrorContext
	>
}

export type CustomErrorInput = evaluate<
	// ensure a custom error can be discriminated on the lack of a code
	{ code?: undefined } & Partial<DerivableErrorContext>
>

export type ArkErrorInput =
	| string
	| ErrorInputByCode[ArkErrorCode]
	| CustomErrorInput

export type ProblemWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: ProblemContext<code>
) => string

export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: MessageContext<code>
) => string

export type getAssociatedDataForError<code extends ArkErrorCode> =
	code extends NodeKind ? Prerequisite<code> : unknown

export type expectedWriterContextFor<code extends ArkErrorCode> = Omit<
	ArkErrorContext<code>,
	keyof DerivableErrorContext
>

export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
	source: expectedWriterContextFor<code>
) => string

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>
) => string | null

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>
