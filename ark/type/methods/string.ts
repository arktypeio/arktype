import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema,
	Pattern
} from "@ark/schema"
import type { applyConstraintSchema } from "../keywords/inference.ts"
import type { ValidatorType } from "./validator.ts"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}>
	extends ValidatorType<t, $> {
	matching<const schema extends Pattern.Schema>(
		schema: schema
	): Type<applyConstraintSchema<t, "pattern", schema>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		applyConstraintSchema<t, "minLength", exclusivizeRangeSchema<schema>>,
		$
	>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		applyConstraintSchema<t, "maxLength", exclusivizeRangeSchema<schema>>,
		$
	>

	exactlyLength<const schema extends ExactLength.Schema>(
		schema: schema
	): Type<applyConstraintSchema<t, "exactLength", schema>, $>
}

export type { Type as StringType }
