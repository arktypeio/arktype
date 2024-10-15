/** Subset of types from https://github.com/standard-schema/standard-schema */
export interface StandardSchema<In, Out> {
	readonly "~standard": 1
	readonly "~vendor": "arktype"
	readonly "~types": StandardSchema.Types<In, Out>
	"~validate": StandardSchema.Validator<Out>
}

export declare namespace StandardSchema {
	export interface Types<In, Out> {
		input: In
		output: Out
	}

	export type Validator<Out> = (input: Input) => Result<Out>

	export interface Input {
		value: unknown
	}

	export type Result<Out> = Success<Out> | Failure

	export interface Success<Out> {
		value: Out
		issues?: undefined
	}

	export interface Failure {
		readonly issues: readonly Issue[]
	}

	export interface Issue {
		readonly message: string
		readonly path: readonly PropertyKey[]
	}
}
