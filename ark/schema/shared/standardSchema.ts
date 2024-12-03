/** Subset of types from https://github.com/standard-schema/standard-schema */

/**
 * The Standard Schema interface.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
	/**
	 * The Standard Schema properties.
	 */
	readonly "~standard": StandardSchemaV1.Props<Input, Output>
}

export declare namespace StandardSchemaV1 {
	/**
	 * The Standard Schema properties interface.
	 */
	export interface Props<Input = unknown, Output = Input> {
		/**
		 * The version number of the standard.
		 */
		readonly version: 1
		/**
		 * The vendor name of the schema library.
		 */
		readonly vendor: string
		/**
		 * Validates unknown input values.
		 */
		readonly validate: (
			value: unknown
		) => Result<Output> | Promise<Result<Output>>
		/**
		 * Inferred types associated with the schema.
		 */
		readonly types?: Types<Input, Output> | undefined
	}

	export interface ArkTypeProps<Input = unknown, Output = Input>
		extends Props<Input, Output> {
		readonly vendor: "arktype"
	}

	/**
	 * The result interface of the validate function.
	 */
	type Result<Output> = SuccessResult<Output> | FailureResult

	/**
	 * The result interface if validation succeeds.
	 */
	interface SuccessResult<Output> {
		/**
		 * The typed output value.
		 */
		readonly value: Output
		/**
		 * The non-existent issues.
		 */
		readonly issues?: undefined
	}

	/**
	 * The result interface if validation fails.
	 */
	export interface FailureResult {
		/**
		 * The issues of failed validation.
		 */
		readonly issues: ReadonlyArray<Issue>
	}

	/**
	 * The issue interface of the failure output.
	 */
	export interface Issue {
		/**
		 * The error message of the issue.
		 */
		readonly message: string
		/**
		 * The path of the issue, if any.
		 */
		readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
	}

	/**
	 * The path segment interface of the issue.
	 */
	interface PathSegment {
		/**
		 * The key representing a path segment.
		 */
		readonly key: PropertyKey
	}

	/**
	 * The base types interface of Standard Schema.
	 */
	interface Types<Input, Output> {
		/**
		 * The input type of the schema.
		 */
		readonly input: Input
		/**
		 * The output type of the schema.
		 */
		readonly output: Output
	}
}
