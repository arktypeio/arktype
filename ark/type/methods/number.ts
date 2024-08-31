import type {
	Divisor,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { applyConstraint } from "../keywords/ast.ts"
import type { ValidatorType } from "./validator.ts"

/** @ts-ignore cast variance */
interface Type<out t extends number = number, $ = {}>
	extends ValidatorType<t, $> {
	divisibleBy<const schema extends Divisor.Schema>(
		schema: schema
	): Type<applyConstraint<t, "divisor", schema>, $>

	atLeast<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "min", schema>, $>

	atMost<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "max", schema>, $>

	moreThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "min", exclusivizeRangeSchema<schema>>, $>

	lessThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "max", exclusivizeRangeSchema<schema>>, $>
}

export type { Type as NumberType }
