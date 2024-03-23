import {
	ReadonlyArray,
	hasDefinedKey,
	type evaluate,
	type optionalizeKeys,
	type propwiseXor
} from "@arktype/util"
import type { Prerequisite, errorContext } from "../kinds.js"
import { arkKind } from "../util.js"
import type { NodeKind } from "./implement.js"
import type { TraversalContext } from "./traversal.js"
import { pathToPropString, type TraversalPath } from "./utils.js"

export class ArkError extends TypeError {
	toString(): string {
		return this.message
	}

	throw(): never {
		throw this
	}
}

export type ArkTypeError<code extends ArkErrorCode = ArkErrorCode> = ArkError &
	ArkErrorContext<code>

export const ArkTypeError: new <code extends ArkErrorCode = ArkErrorCode>(
	context: ArkErrorContext<code>
) => ArkTypeError<code> = class extends ArkError {
	readonly [arkKind] = "error"

	constructor(context: ArkErrorContext) {
		super(context.message)
		Object.assign(this, context)
	}
} as never

export class ArkErrors extends ReadonlyArray<ArkTypeError> {
	constructor(protected ctx: TraversalContext) {
		super()
	}

	byPath: Record<string, ArkTypeError> = {}
	count = 0
	private mutable: ArkTypeError[] = this as never

	add(error: ArkTypeError): void {
		const pathKey = error.path.join(".")
		const existing = this.byPath[pathKey]
		if (existing) {
			const errorIntersection = createError(this.ctx, {
				code: "intersection",
				errors:
					existing.code === "intersection"
						? [...existing.errors, error]
						: [existing, error]
			})
			const existingIndex = this.indexOf(existing)
			// If existing is found (which it always should be unless this was externally mutated),
			// replace it with the new problem intersection. In case it isn't for whatever reason,
			// just append the intersection.
			this.mutable[existingIndex === -1 ? this.length : existingIndex] =
				errorIntersection
			this.byPath[pathKey] = errorIntersection
		} else {
			this.byPath[pathKey] = error
			this.mutable.push(error)
		}
		this.count++
	}

	get summary(): string {
		return this.toString()
	}

	toString(): string {
		return this.join("\n")
	}

	throw(): never {
		throw new ArkError(`${this}`, { cause: this })
	}
}

export const createError = (
	ctx: TraversalContext,
	input: ArkErrorInput
): ArkTypeError => {
	let errCtx: ArkErrorContext
	const data = ctx.data
	const nodeConfig = ctx.config.predicate
	if (typeof input === "string") {
		errCtx = {
			code: "predicate",
			path: [...ctx.path],
			propString: pathToPropString(ctx.path),
			data,
			actual: nodeConfig.actual(data),
			expected: input
		} satisfies ProblemContext as any
		errCtx.problem = nodeConfig.problem(errCtx as never)
		errCtx.message = nodeConfig.message(errCtx as never)
	} else {
		const code = input.code ?? "predicate"
		const nodeConfig = ctx.config[code]
		const expected = input.expected ?? nodeConfig.expected?.(input as never)
		const path = input.path ?? [...ctx.path]
		errCtx = {
			...input,
			// prioritize these over the raw user provided values so we can
			// check for keys with values like undefined
			code,
			path,
			propString: pathToPropString(path),
			data: "data" in input ? input.data : data,
			actual:
				input.actual !== undefined
					? input.actual
					: nodeConfig.actual?.(data as never),
			expected
		} satisfies ProblemContext as any
		errCtx.problem = hasDefinedKey(input, "problem")
			? input.problem
			: nodeConfig.problem(errCtx as never)
		errCtx.message = hasDefinedKey(input, "message")
			? input.message
			: nodeConfig.message(errCtx as never)
	}
	return new ArkTypeError(errCtx)
}

export interface DerivableErrorContext<data = unknown> {
	expected: string
	actual: string | null
	problem: string
	message: string
	data: data
	path: TraversalPath
	propString: string
}

export type ArkErrorCode = {
	[kind in NodeKind]: errorContext<kind> extends null ? never : kind
}[NodeKind]

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> =
	errorContext<code> & DerivableErrorContext<Prerequisite<code>>

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
		ArkErrorContext<code>,
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

export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
	source: errorContext<code>
) => string

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>
) => string | null

export type ArkResult<data = unknown, out = data> = propwiseXor<
	{ data: data; out: out },
	{ errors: ArkErrors }
>
