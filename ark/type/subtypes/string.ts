import type {
	ExactLength,
	InclusiveNumericRangeSchema,
	Pattern
} from "@ark/schema"
import type { applyConstraint } from "../ast.js"
import type { ValidatorType } from "./validator.js"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}>
	extends ValidatorType<t, $> {
	matching<const schema extends Pattern.Schema>(
		schema: schema
	): Type<applyConstraint<t, "pattern", schema>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "maxLength", schema>, $>

	exactlyLength<const schema extends ExactLength.Schema>(
		schema: schema
	): Type<applyConstraint<t, "exactLength", schema>, $>
}

export type { Type as StringType }
