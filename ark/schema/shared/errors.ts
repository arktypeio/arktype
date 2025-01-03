import {
	CastableBase,
	ReadonlyArray,
	ReadonlyPath,
	append,
	defineProperties,
	stringifyPath,
	type array,
	type merge,
	type propwiseXor,
	type show
} from "@ark/util"
import type { ResolvedArkConfig } from "../config.ts"
import type { Prerequisite, errorContext } from "../kinds.ts"
import type { BaseMeta } from "./declare.ts"
import type { NodeKind } from "./implement.ts"
import type { StandardSchemaV1 } from "./standardSchema.ts"
import type { TraversalContext } from "./traversal.ts"
import { arkKind } from "./utils.ts"

export type ArkErrorResult = ArkError | ArkErrors

export class ArkError<
	code extends ArkErrorCode = ArkErrorCode
> extends CastableBase<ArkErrorContextInput<code>> {
	readonly [arkKind] = "error"
	path: ReadonlyPath
	data: Prerequisite<code>
	private nodeConfig: ResolvedArkConfig[code]
	protected input: ArkErrorContextInput<code>

	constructor(input: ArkErrorContextInput<code>, ctx: TraversalContext)
	// TS gets confused by <code>, so internally we just use the base type for input
	constructor(input: ArkErrorContextInput, ctx: TraversalContext) {
		super()
		this.input = input as never
		defineProperties(this, input)
		const data = ctx.data
		if (input.code === "union") {
			// flatten union errors to avoid repeating context like "foo must be foo must be"...
			input.errors = input.errors.flatMap(e =>
				e.hasCode("union") ? e.errors : e
			)
		}
		this.nodeConfig = ctx.config[this.code] as never
		this.path =
			input.relativePath ? new ReadonlyPath(...ctx.path, ...input.relativePath)
			: input.path ? new ReadonlyPath(...input.path)
			: new ReadonlyPath(...ctx.path)
		this.data = "data" in input ? input.data : data
	}

	hasCode<code extends ArkErrorCode>(code: code): this is ArkError<code> {
		return this.code === code
	}

	get propString(): string {
		return stringifyPath(this.path)
	}

	get expected(): string {
		return (
			this.input.expected ??
			this.meta?.expected?.(this.input as never) ??
			this.nodeConfig.expected?.(this.input as never)
		)
	}

	get actual(): string {
		return (
			this.input.actual ??
			this.meta?.actual?.(this.data as never) ??
			this.nodeConfig.actual?.(this.data as never)
		)
	}

	get problem(): string {
		return (
			this.input.problem ??
			this.meta?.problem?.(this as never) ??
			this.nodeConfig.problem(this as never)
		)
	}

	get message(): string {
		return (
			this.input.message ??
			this.meta?.message?.(this as never) ??
			this.nodeConfig.message(this as never)
		)
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
	implements StandardSchemaV1.FailureResult
{
	protected ctx: TraversalContext

	constructor(ctx: TraversalContext) {
		super()
		this.ctx = ctx
	}

	byPath: Record<string, ArkError> = Object.create(null)
	byAncestorPath: Record<string, ArkError[]> = Object.create(null)

	count = 0
	private mutable: ArkError[] = this as never

	add(error: ArkError): void {
		if (this.includes(error)) return
		this._add(error)
	}

	affectsPath(path: ReadonlyPath): boolean {
		if (this.length === 0) return false

		return (
			// this would occur if there is an existing error at a prefix of path
			// e.g. the path is ["foo", "bar"] and there is an error at ["foo"]
			path.stringifyAncestors().some(s => s in this.byPath) ||
			// this would occur if there is an existing error at a suffix of path
			// e.g. the path is ["foo"] and there is an error at ["foo", "bar"]
			path.stringify() in this.byAncestorPath
		)
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
			this.mutable[existingIndex === -1 ? this.length : existingIndex] =
				errorIntersection

			this.byPath[error.propString] = errorIntersection
			// add the original error here rather than the intersection
			// since the intersection is reflected by the array of errors at
			// this path
			this.addAncestorPaths(error)
		} else {
			this.byPath[error.propString] = error
			this.addAncestorPaths(error)
			this.mutable.push(error)
		}
		this.count++
	}

	private addAncestorPaths(error: ArkError): void {
		error.path.stringifyAncestors().forEach(propString => {
			this.byAncestorPath[propString] = append(
				this.byAncestorPath[propString],
				error
			)
		})
	}

	merge(errors: ArkErrors): void {
		errors.forEach(e => {
			if (this.includes(e)) return
			this._add(
				new ArkError(
					{ ...e, path: [...this.ctx.path, ...e.path] } as never,
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
	relativePath?: array<PropertyKey>
}

export interface DerivableErrorContext<
	code extends ArkErrorCode = ArkErrorCode
> {
	expected: string
	actual: string
	problem: string
	message: string
	data: Prerequisite<code>
	path: array<PropertyKey>
	propString: string
}

export type DerivableErrorContextInput<
	code extends ArkErrorCode = ArkErrorCode
> = Partial<DerivableErrorContext<code>> &
	propwiseXor<
		{ path?: array<PropertyKey> },
		{ relativePath?: array<PropertyKey> }
	>

export type ArkErrorCode = {
	[kind in NodeKind]: errorContext<kind> extends null ? never : kind
}[NodeKind]

type ArkErrorContextInputsByCode = {
	[code in ArkErrorCode]: errorContext<code> & DerivableErrorContextInput<code>
}

export type ArkErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	merge<ArkErrorContextInputsByCode[code], { meta?: BaseMeta }>

export type NodeErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextInputsByCode[code] & { meta: BaseMeta }

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
