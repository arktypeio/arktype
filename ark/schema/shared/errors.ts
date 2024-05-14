import { DynamicBase, ReadonlyArray, type show } from "@arktype/util"
import type { Prerequisite, errorContext } from "../kinds.js"
import type { ResolvedArkConfig } from "../scope.js"
import type { NodeKind } from "./implement.js"
import type { TraversalContext } from "./traversal.js"
import { arkKind, pathToPropString, type TraversalPath } from "./utils.js"

export const throwArkError = (message: string): never => {
	throw new ArkError(message)
}

export class ArkError extends TypeError {
	toString(): string {
		return this.message
	}

	throw(): never {
		throw this
	}
}

export class ArkTypeError<
	code extends ArkErrorCode = ArkErrorCode
> extends DynamicBase<ArkErrorContextInput<code>> {
	readonly [arkKind] = "error"
	path: TraversalPath
	data: Prerequisite<code>
	private nodeConfig: ResolvedArkConfig[code]

	constructor(
		protected input: ArkErrorContextInput<code>,
		ctx: TraversalContext
	) {
		super(input)
		const data = ctx.data
		if (input.code === "union") {
			// flatten union errors to avoid repeating context like "foo must be foo must be"...
			input.errors = input.errors.flatMap(e =>
				e.hasCode("union") ? e.errors : e
			)
		}
		this.nodeConfig = ctx.config[this.code] as never
		this.path = input.path ?? [...ctx.path]
		this.data = "data" in input ? input.data : data
	}

	hasCode<code extends ArkErrorCode>(code: code): this is ArkTypeError<code> {
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

	get actual(): string | null {
		// null is a valid value of actual meaning it should be omitted, so
		// check for undefined explicitly
		return this.input.actual !== undefined ?
				this.input.actual
			:	this.nodeConfig.actual?.(this.data as never)
	}

	get problem(): string {
		return this.input.problem ?? this.nodeConfig.problem(this as never)
	}

	get message(): string {
		return this.input.message ?? this.nodeConfig.message(this as never)
	}
}

export class ArkErrors extends ReadonlyArray<ArkTypeError> {
	constructor(protected ctx: TraversalContext) {
		super()
	}

	byPath: Record<string, ArkTypeError> = {}
	count = 0
	private mutable: ArkTypeError[] = this as never

	add(error: ArkTypeError): void {
		const existing = this.byPath[error.propString]
		if (existing) {
			const errorIntersection = new ArkTypeError(
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

export interface DerivableErrorContext<
	code extends ArkErrorCode = ArkErrorCode
> {
	expected: string
	actual: string | null
	problem: string
	message: string
	data: Prerequisite<code>
	path: TraversalPath
	propString: string
}

export type ArkErrorCode = {
	[kind in NodeKind]: errorContext<kind> extends null ? never : kind
}[NodeKind]

type ArkErrorContextInputsByCode = {
	[code in ArkErrorCode]: errorContext<code> &
		Partial<DerivableErrorContext<code>>
}

export type ArkErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextInputsByCode[code]

export type MessageContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	ArkTypeError<code>,
	"message"
>

export type ProblemContext<code extends ArkErrorCode = ArkErrorCode> = Omit<
	MessageContext<code>,
	"problem"
>

export type CustomErrorInput = show<
	// ensure a custom error can be discriminated on the lack of a code
	{ code?: undefined } & Partial<DerivableErrorContext>
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
) => string | null
