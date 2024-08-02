import type {
	ExactLengthSchema,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema,
	PatternSchema
} from "@ark/schema"
import type { applyConstraint } from "../ast.js"
import type { ValidatorType } from "./validator.js"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}>
	extends ValidatorType<t, $> {
	matching<const schema extends PatternSchema>(
		schema: schema
	): Type<applyConstraint<t, "pattern", schema>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "minLength", exclusivizeRangeSchema<schema>>, $>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "maxLength", exclusivizeRangeSchema<schema>>, $>

	exactlyLength<const schema extends ExactLengthSchema>(
		schema: schema
	): Type<applyConstraint<t, "exactLength", schema>, $>
}

export type { Type as StringType }
