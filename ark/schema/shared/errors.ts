import {
	CastableBase,
	ReadonlyArray,
	defineProperties,
	type propwiseXor,
	type show
} from "@ark/util"
import type { ResolvedArkConfig } from "../config.ts"
import type { Prerequisite, errorContext } from "../kinds.ts"
import type { NodeKind } from "./implement.ts"
import type { StandardSchema } from "./standardSchema.ts"
import type { TraversalContext } from "./traversal.ts"
import { arkKind, pathToPropString, type TraversalPath } from "./utils.ts"

export type ArkErrorResult = ArkError | ArkErrors

export class ArkError<
	code extends ArkErrorCode = ArkErrorCode
> extends CastableBase<ArkErrorContextInput<code>> {
	readonly [arkKind] = "error"
	path: TraversalPath
	data: Prerequisite<code>
	private nodeConfig: ResolvedArkConfig[code]
	protected input: ArkErrorContextInput<code>

	constructor(input: ArkErrorContextInput<code>, ctx: TraversalContext) {
		super()
		this.input = input
		defineProperties(this, input)
		const data = ctx.data
		if (input.code === "union") {
			// flatten union errors to avoid repeating context like "foo must be foo must be"...
			input.errors = input.errors.flatMap(e =>
				e.hasCode("union") ? e.errors : e
			)
		}
		this.nodeConfig = ctx.config[this.code] as never
		this.path = input.path ?? [...ctx.path]
		if (input.relativePath) this.path.push(...input.relativePath)
		this.data = "data" in input ? input.data : data
	}

	hasCode<code extends ArkErrorCode>(code: code): this is ArkError<code> {
		return this.code === code
	}

	get propString(): string {
		return pathToPropString(this.path)
	}

	get expected(): string {
		return (
			this.input.expected ?? this.nodeConfig.expected?.(this.input as never)
		)
	}

	get actual(): string {
		return this.input.actual ?? this.nodeConfig.actual?.(this.data as never)
	}

	get problem(): string {
		return this.input.problem ?? this.nodeConfig.problem(this as never)
	}

	get message(): string {
		return this.input.message ?? this.nodeConfig.message(this as never)
	}

	toString(): string {
		return this.message
	}

	throw(): never {
		throw this
	}
}

export class ArkErrors
	extends ReadonlyArray<ArkError>
	implements StandardSchema.Failure
{
	protected ctx: TraversalContext

	constructor(ctx: TraversalContext) {
		super()
		this.ctx = ctx
	}

	byPath: Record<string, ArkError> = Object.create(null)
	count = 0
	private mutable: ArkError[] = this as never

	add(error: ArkError): void {
		if (this.includes(error)) return
		this._add(error)
	}

	private _add(error: ArkError): void {
		const existing = this.byPath[error.propString]
		if (existing) {
			const errorIntersection = new ArkError(
				{
					code: "intersection",
					errors:
						existing.hasCode("intersection") ?
							[...existing.errors, error]
						:	[existing, error]
				},
				this.ctx
			)
			const existingIndex = this.indexOf(existing)
			// If existing is found (which it always should be unless this was externally mutated),
			// replace it with the new problem intersection. In case it isn't for whatever reason,
			// just append the intersection.
			this.mutable[existingIndex === -1 ? this.length : existingIndex] =
				errorIntersection
			this.byPath[error.propString] = errorIntersection
		} else {
			this.byPath[error.propString] = error
			this.mutable.push(error)
		}
		this.count++
	}

	merge(errors: ArkErrors): void {
		errors.forEach(e => {
			if (this.includes(e)) return
			this._add(
				new ArkError(
					{ ...e, path: [...e.path, ...this.ctx.path] } as never,
					this.ctx
				)
			)
		})
	}

	get summary(): string {
		return this.toString()
	}

	get message(): string {
		return this.toString()
	}

	/** Reference to this ArkErrors array (for Standard Schema compatibility) */
	get issues(): this {
		return this
	}

	toString(): string {
		return this.join("\n")
	}

	throw(): never {
		throw new AggregateError(this, this.message)
	}
}

export type ArkErrorsMergeOptions = {
	relativePath?: TraversalPath
}

export interface DerivableErrorContext<
	code extends ArkErrorCode = ArkErrorCode
> {
	expected: string
	actual: string
	problem: string
	message: string
	data: Prerequisite<code>
	path: TraversalPath
	propString: string
}

export type DerivableErrorContextInput<
	code extends ArkErrorCode = ArkErrorCode
> = Partial<DerivableErrorContext<code>> &
	propwiseXor<{ path?: TraversalPath }, { relativePath?: TraversalPath }>

export type ArkErrorCode = {
	[kind in NodeKind]: errorContext<kind> extends null ? never : kind
}[NodeKind]

type ArkErrorContextInputsByCode = {
	[code in ArkErrorCode]: errorContext<code> & DerivableErrorContextInput<code>
}

export type ArkErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextInputsByCode[code]

export type MessageContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	ArkError<code>,
	"message"
>

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	MessageContext<code>,
	"problem"
>

export type CustomErrorInput = show<
	// ensure a custom error can be discriminated on the lack of a code
	{ code?: undefined } & DerivableErrorContextInput
>

export type ArkErrorInput = string | ArkErrorContextInput | CustomErrorInput

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
) => string
