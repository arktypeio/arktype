import type {
	MessageConfig,
	ExactLength,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { ObjectType } from "./object.ts"

interface Type<
	/** @ts-ignore cast variance */
	out t extends readonly unknown[] = readonly unknown[],
	in out $ = {}
> extends ObjectType<t, $> {
	atLeastLength(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig<"minLength">
	): this

	atMostLength(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig<"maxLength">
	): this

	moreThanLength(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig<"minLength">
	): this

	lessThanLength(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig<"maxLength">
	): this

	exactlyLength(
		schema: ExactLength.Schema,
		message?: MessageConfig<"exactLength">
	): this
}

export type { Type as ArrayType }
