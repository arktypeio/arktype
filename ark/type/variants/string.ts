import type {
	MessageConfig,
	ExactLength,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema,
	Pattern
} from "@ark/schema"
import type { regex } from "arkregex"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, in out $ = {}>
	extends BaseType<t, $> {
	matching<const schema extends Pattern.Schema>(
		schema: schema,
		message?: MessageConfig<"pattern">
	): schema extends string ? Type<regex.infer<schema>, $>
	: schema extends { rule: infer pattern extends string } ?
		Type<regex.infer<pattern>, $>
	:	this

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

export type { Type as StringType }
