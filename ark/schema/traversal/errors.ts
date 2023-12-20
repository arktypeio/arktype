import {
	ReadonlyArray,
	type ErrorMessage,
	type autocomplete,
	type evaluate,
	type extend,
	type optionalizeKeys,
	type propwiseXor,
	type require
} from "@arktype/util"
import type { Inner, Prerequisite } from "../kinds.js"
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
		message: string
	) {
		super(message)
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
	private mutable: ArkTypeError[] = this as never

	add<codeOrDescription extends autocomplete<ArkErrorCode>>(
		codeOrDescription: codeOrDescription,
		...rest: codeOrDescription extends ArkErrorCode
			? [input: ArkErrorInput<codeOrDescription>]
			: []
	): ArkTypeError {
		if (!(codeOrDescription in arkErrorCodes)) {
			// treat as the description of a custom error
			const error = new ArkTypeError(
				"custom",
				{
					path: [...this.context.path],
					data: this.context.data,
					expected: codeOrDescription
				},
				""
			)
			this.mutable.push(error)
			return error
		}
		const input: ArkErrorInput = rest[0]!
		const context: DerivableErrorContext = {
			path: input.path ?? [...this.context.path],
			// check for presence explicitly in case data is nullish
			data: "data" in input ? input.data : this.context.data,
			// write default for code
			expected: ""
		}
		const pathKey = this.context.path.join(".")
		// const existing = this.byPath[pathKey]
		// if (existing) {
		// 	// if (existing.hasCode("intersection")) {
		// 	// 	existing.rule.push(problem)
		// 	// } else {
		// 	// 	const problemIntersection = new ProblemIntersection(
		// 	// 		[existing, problem],
		// 	// 		problem.data,
		// 	// 		problem.path
		// 	// 	)
		// 	// 	const existingIndex = this.indexOf(existing)
		// 	// 	// If existing is found (which it always should be unless this was externally mutated),
		// 	// 	// replace it with the new problem intersection. In case it isn't for whatever reason,
		// 	// 	// just append the intersection.
		// 	// 	this[existingIndex === -1 ? this.length : existingIndex] =
		// 	// 		problemIntersection
		// 	// 	this.byPath[pathKey] = problemIntersection
		// 	// }
		// } else {
		const error = new ArkTypeError(
			codeOrDescription as ArkErrorCode,
			context as any,
			""
		)
		this.byPath[pathKey] = error
		this.mutable.push(error)
		//}
		this.count++
		return error as never
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

export const arkErrorCodes = {
	unit: true,
	proto: true,
	domain: true,
	pattern: true,
	predicate: true,
	divisor: true,
	min: true,
	max: true,
	minLength: true,
	maxLength: true,
	after: true,
	before: true,
	union: true,
	intersection: true,
	missingKey: true,
	extraneousKey: true,
	custom: true
} satisfies Record<BaseArkErrorCode, true>

export interface CustomErrorContext extends DerivableErrorContext {
	expected: string
}

export interface KeyErrorContext extends DerivableErrorContext<object> {
	key: string | symbol
}

export interface CompositeErrorContext extends DerivableErrorContext {
	errors: readonly ArkError[]
}

export interface DerivableErrorContext<data = unknown> {
	expected: string
	data: data
	path: TraversalPath
}

type BaseArkErrorContextsByCode = evaluate<
	{
		[k in PrimitiveKind]: extend<
			DerivableErrorContext<Prerequisite<k>>,
			Omit<Inner<k>, "description">
		>
	} & {
		custom: CustomErrorContext
		missingKey: KeyErrorContext
		extraneousKey: KeyErrorContext
		intersection: CompositeErrorContext
		union: CompositeErrorContext
	}
>

export type BaseArkErrorCode = keyof BaseArkErrorContextsByCode

export type ArkErrorContextsByCode = BaseArkErrorContextsByCode &
	StaticArkOption<"errors">

export type ArkErrorCode = keyof ArkErrorContextsByCode

export type ArkErrorContext<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorContextsByCode[code]

type ArkErrorInputByCode = {
	[code in ArkErrorCode]: optionalizeKeys<
		ArkErrorContextsByCode[code],
		keyof DerivableErrorContext
	>
}

export type ArkErrorInput<code extends ArkErrorCode = ArkErrorCode> =
	ArkErrorInputByCode[code]

export type ArkExpectedWriter<code extends ArkErrorCode = ArkErrorCode> = (
	input: ArkErrorInput<code>
) => string

export type ArkMessageWriter<code extends ArkErrorCode = ArkErrorCode> = (
	context: ArkErrorContext<code>
) => string

export type ErrorsConfig = {
	[code in ArkErrorCode]?: {
		expected?: ArkExpectedWriter<code>
		message?: ArkMessageWriter<code>
	}
}

export type ParsedErrorsConfig = require<ErrorsConfig>

export type ArkResult<out = unknown> = propwiseXor<
	{ out: out },
	{ errors: ArkErrors }
>
