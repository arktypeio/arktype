import {
	CastableBase,
	ReadonlyArray,
	ReadonlyPath,
	append,
	conflatenateAll,
	defineProperties,
	flatMorph,
	stringifyPath,
	type JsonArray,
	type JsonObject,
	type array,
	type merge,
	type propwiseXor,
	type show
} from "@ark/util"
import type { ResolvedConfig } from "../config.ts"
import type { Prerequisite, errorContext } from "../kinds.ts"
import type { NodeMeta } from "./declare.ts"
import type { NodeKind } from "./implement.ts"
import type { StandardSchemaV1 } from "./standardSchema.ts"
import type { Traversal } from "./traversal.ts"
import { arkKind } from "./utils.ts"

export type ArkErrorResult = ArkError | ArkErrors

export class ArkError<
	code extends ArkErrorCode = ArkErrorCode
> extends CastableBase<ArkErrorContextInput<code>> {
	readonly [arkKind] = "error"
	path: ReadonlyPath
	data: Prerequisite<code>
	private nodeConfig: ResolvedConfig[code]
	protected input: ArkErrorContextInput<code>
	protected ctx: Traversal

	constructor(input: ArkErrorContextInput<code>, ctx: Traversal)
	// TS gets confused by <code>, so internally we just use the base type for input
	constructor(
		{ prefixPath, relativePath, ...input }: ArkErrorContextInput,
		ctx: Traversal
	) {
		super()
		this.input = input as never
		this.ctx = ctx
		defineProperties(this, input)
		const data = ctx.data
		if (input.code === "union") {
			input.errors = input.errors.flatMap(innerError => {
				// flatten union errors to avoid repeating context like "foo must be foo must be"...
				const flat =
					innerError.hasCode("union") ? innerError.errors : [innerError]

				if (!prefixPath && !relativePath) return flat

				return flat.map(e =>
					e.transform(
						e =>
							({
								...e,
								path: conflatenateAll(prefixPath, e.path, relativePath)
							}) as never
					)
				)
			})
		}
		this.nodeConfig = ctx.config[this.code] as never
		const basePath = [...(input.path ?? ctx.path)]
		if (relativePath) basePath.push(...relativePath)
		if (prefixPath) basePath.unshift(...prefixPath)
		this.path = new ReadonlyPath(...basePath)
		this.data = "data" in input ? input.data : data
	}

	transform(
		f: (input: ArkErrorContextInput<code>) => ArkErrorContextInput
	): ArkError {
		return new ArkError(
			f({
				data: this.data,
				path: this.path,
				...this.input
			}),
			this.ctx
		) as never
	}

	hasCode<code extends ArkErrorCode>(code: code): this is ArkError<code> {
		return this.code === code
	}

	get propString(): string {
		return stringifyPath(this.path)
	}

	get expected(): string {
		if (this.input.expected) return this.input.expected

		const config = this.meta?.expected ?? this.nodeConfig.expected

		return typeof config === "function" ? config(this.input as never) : config
	}

	get actual(): string {
		if (this.input.actual) return this.input.actual

		const config = this.meta?.actual ?? this.nodeConfig.actual

		return typeof config === "function" ? config(this.data as never) : config
	}

	get problem(): string {
		if (this.input.problem) return this.input.problem

		const config = this.meta?.problem ?? this.nodeConfig.problem

		return typeof config === "function" ? config(this as never) : config
	}

	get message(): string {
		if (this.input.message) return this.input.message

		const config = this.meta?.message ?? this.nodeConfig.message

		return typeof config === "function" ? config(this as never) : config
	}

	get flat(): ArkError[] {
		return this.hasCode("intersection") ? [...this.errors] : [this as never]
	}

	toJSON(): JsonObject {
		return {
			data: this.data,
			path: this.path,
			...this.input,
			expected: this.expected,
			actual: this.actual,
			problem: this.problem,
			message: this.message
		} as never
	}

	toString(): string {
		return this.message
	}

	throw(): never {
		throw this
	}
}

export declare namespace ArkErrors {
	export type Handler<returns = unknown> = (errors: ArkErrors) => returns
}

/**
 * A ReadonlyArray of `ArkError`s returned by a Type on invalid input.
 *
 * Subsequent errors added at an existing path are merged into an
 * ArkError intersection.
 */
export class ArkErrors
	extends ReadonlyArray<ArkError>
	implements StandardSchemaV1.FailureResult
{
	readonly [arkKind] = "errors"

	protected ctx: Traversal

	constructor(ctx: Traversal) {
		super()
		this.ctx = ctx
	}

	/**
	 * Errors by a pathString representing their location.
	 */
	byPath: Record<string, ArkError> = Object.create(null)

	/**
	 * {@link byPath} flattened so that each value is an array of ArkError instances at that path.
	 *
	 * ✅ Since "intersection" errors will be flattened to their constituent `.errors`,
	 * they will never be directly present in this representation.
	 */
	get flatByPath(): Record<string, ArkError[]> {
		return flatMorph(this.byPath, (k, v) => [k, v.flat])
	}

	/**
	 * {@link byPath} flattened so that each value is an array of problem strings at that path.
	 */
	get flatProblemsByPath(): Record<string, string[]> {
		return flatMorph(this.byPath, (k, v) => [k, v.flat.map(e => e.problem)])
	}

	/**
	 * All pathStrings at which errors are present mapped to the errors occuring
	 * at that path or any nested path within it.
	 */
	byAncestorPath: Record<string, ArkError[]> = Object.create(null)

	count = 0
	private mutable: ArkError[] = this as never

	/**
	 * Throw a TraversalError based on these errors.
	 */
	throw(): never {
		throw this.toTraversalError()
	}

	/**
	 * Converts ArkErrors to TraversalError, a subclass of `Error` suitable for throwing with nice
	 * formatting.
	 */
	toTraversalError(): TraversalError {
		return new TraversalError(this)
	}

	/**
	 * Append an ArkError to this array, ignoring duplicates.
	 */
	add(error: ArkError): void {
		if (this.includes(error)) return
		this._add(error)
	}

	transform(f: (e: ArkError) => ArkError): ArkErrors {
		const result = new ArkErrors(this.ctx)
		for (const e of this) result.add(f(e))
		return result
	}

	/**
	 * Add all errors from an ArkErrors instance, ignoring duplicates and
	 * prefixing their paths with that of the current Traversal.
	 */
	merge(errors: ArkErrors): void {
		for (const e of errors) {
			if (this.includes(e)) continue
			this._add(
				new ArkError(
					{ ...e, path: [...this.ctx.path, ...e.path] } as never,
					this.ctx
				)
			)
		}
	}

	/**
	 * @internal
	 */
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

	/**
	 * A human-readable summary of all errors.
	 */
	get summary(): string {
		return this.toString()
	}

	/**
	 * Alias of this ArkErrors instance for StandardSchema compatibility.
	 */
	get issues(): this {
		return this
	}

	toJSON(): JsonArray {
		return [...this.map(e => e.toJSON())]
	}

	toString(): string {
		return this.join("\n")
	}

	private _add(error: ArkError): void {
		const existing = this.byPath[error.propString]
		if (existing) {
			// If the existing error is an error for a value constrained to "never",
			// then we don't want to intersect the error messages.
			if (existing.hasCode("union") && existing.errors.length === 0) return

			// If the new error is an error for a value constrained to "never",
			// then we want to override any existing errors.
			const errorIntersection =
				error.hasCode("union") && error.errors.length === 0 ?
					error
				:	new ArkError(
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
		for (const propString of error.path.stringifyAncestors()) {
			this.byAncestorPath[propString] = append(
				this.byAncestorPath[propString],
				error
			)
		}
	}
}

export class TraversalError extends Error {
	readonly name = "TraversalError"
	declare arkErrors: ArkErrors

	constructor(errors: ArkErrors) {
		if (errors.length === 1) super(errors.summary)
		else super("\n" + errors.map(error => `  • ${indent(error)}`).join("\n"))

		Object.defineProperty(this, "arkErrors", {
			value: errors,
			enumerable: false
		})
	}
}

const indent = (error: ArkError): string =>
	error.toString().split("\n").join("\n  ")

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
		{ relativePath?: array<PropertyKey>; prefixPath?: array<PropertyKey> }
	>

export type ArkErrorCode = {
	[kind in NodeKind]: errorContext<kind> extends null ? never : kind
}[NodeKind]

type ArkErrorContextInputsByCode = {
	[code in ArkErrorCode]: errorContext<code> & DerivableErrorContextInput<code>
}

export type ArkErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	merge<ArkErrorContextInputsByCode[code], { meta?: NodeMeta }>

export type NodeErrorContextInput<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextInputsByCode[code] & { meta: NodeMeta }

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

export type ProblemConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| ProblemWriter<code>

export type ProblemWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: ProblemContext<code>
) => string

export type MessageConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| MessageWriter<code>

export type MessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: MessageContext<code>
) => string

export type getAssociatedDataForError<code extends ArkErrorCode> =
	code extends NodeKind ? Prerequisite<code> : unknown

export type ExpectedConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| ExpectedWriter<code>

export type ExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
	source: errorContext<code>
) => string

export type ActualConfig<code extends ArkErrorCode = ArkErrorCode> =
	| string
	| ActualWriter<code>

export type ActualWriter<code extends ArkErrorCode = ArkErrorCode> = (
	data: getAssociatedDataForError<code>
) => string
