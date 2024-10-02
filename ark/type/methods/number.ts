import type {
	Divisor,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { applyConstraintSchema } from "../keywords/inference.ts"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends number = number, $ = {}> extends BaseType<t, $> {
	divisibleBy<const schema extends Divisor.Schema>(
		schema: schema
	): Type<applyConstraintSchema<t, "divisor", schema>, $>

	atLeast<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "min", schema>, $>

	atMost<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "max", schema>, $>

	moreThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "min", exclusivizeRangeSchema<schema>>, $>

	lessThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "max", exclusivizeRangeSchema<schema>>, $>
}

export type { Type as NumberType }
