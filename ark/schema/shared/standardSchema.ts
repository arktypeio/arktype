/** From https://github.com/standard-schema/standard-schema */

/**
 * The Standard Schema interface.
 */
export type StandardSchemaV1<Input = unknown, Output = Input> = {
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
		extends Props<Input, Output>,
			StandardJSONSchemaSourceV1.Props {
		readonly vendor: "arktype"
	}

	/**
	 * The result interface of the validate function.
	 */
	export type Result<Output> = SuccessResult<Output> | FailureResult

	/**
	 * The result interface if validation succeeds.
	 */
	export interface SuccessResult<Output> {
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
	export interface PathSegment {
		/**
		 * The key representing a path segment.
		 */
		readonly key: PropertyKey
	}

	/**
	 * The Standard Schema types interface.
	 */
	export interface Types<Input = unknown, Output = Input> {
		/**
		 * The input type of the schema.
		 */
		readonly input: Input
		/**
		 * The output type of the schema.
		 */
		readonly output: Output
	}

	/**
	 * Infers the input type of a Standard Schema.
	 */
	export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
		Schema["~standard"]["types"]
	>["input"]

	/**
	 * Infers the output type of a Standard Schema.
	 */
	export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
		Schema["~standard"]["types"]
	>["output"]

	/**
	 * A Standard Schema that implements the Standard JSON Schema Source interface.
	 * */
	export interface WithJSONSchemaSource<Input = unknown, Output = Input> {
		"~standard": StandardJSONSchemaSourceV1.PropsWithStandardSchema<
			Input,
			Output
		>
	}

	// biome-ignore lint/complexity/noUselessEmptyExport: needed for granular visibility control of TS namespace
	export {}
}

/**
 * The Standard JSON Schema Source interface. A standard interface to be implemented by any object/instance that can be converted to JSON Schema.
 */
export interface StandardJSONSchemaSourceV1 {
	"~standard": StandardJSONSchemaSourceV1.Props
}

export declare namespace StandardJSONSchemaSourceV1 {
	export interface Props {
		/**
		 * Converts the Standard Schema to a JSON Schema.
		 * @param params - The options for the toJSONSchema method.
		 *
		 * @returns The JSON Schema.
		 */
		readonly toJSONSchema: (
			params: StandardJSONSchemaSourceV1.Options
		) => Record<string, unknown>
	}

	export interface PropsWithStandardSchema<Input = unknown, Output = Input>
		extends Props,
			StandardSchemaV1.Props<Input, Output> {}

	/** The target version of the JSON Schema spec. */
	export type Target =
		| "draft-04"
		| "draft-06"
		| "draft-07"
		| "draft-2019-09"
		| "draft-2020-12"

	export type IO = "input" | "output"

	/** The options for the ~toJSONSchema method. */
	export interface Options {
		/** @ Specifies whether the generated JSON Schema should reflect the expected input or output values. */
		readonly io: IO
		/** Specifies the target version of the JSON Schema spec. Support for all versions is on a best-effort basis. If a given version is not supported, the library should throw. When unspecified, implementers should target "draft-2020-12". */
		readonly target?: Target
	}
}
