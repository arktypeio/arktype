import type {
	MessageConfig,
	Divisor,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends number = number, in out $ = {}>
	extends BaseType<t, $> {
	divisibleBy(schema: Divisor.Schema, message?: MessageConfig<"divisor">): this

	atLeast(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig<"min">
	): this

	atMost(
		schema: InclusiveNumericRangeSchema,
		message?: MessageConfig<"max">
	): this

	moreThan(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig<"min">
	): this

	lessThan(
		schema: ExclusiveNumericRangeSchema,
		message?: MessageConfig<"max">
	): this
}

export type { Type as NumberType }
