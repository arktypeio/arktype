import type {
	DivisorSchema,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { parseConstraint } from "../ast.js"
import type { Type as BaseType } from "../type.js"

/** @ts-ignore cast variance */
interface Type<out t extends number = number, $ = {}> extends BaseType<t, $> {
	divisibleBy<const schema extends DivisorSchema>(
		schema: schema
	): Type<parseConstraint<t, "divisor", schema>, $>

	atLeast<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "min", schema>, $>

	atMost<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "max", schema>, $>

	moreThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "min", exclusivizeRangeSchema<schema>>, $>

	lessThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "max", exclusivizeRangeSchema<schema>>, $>
}

export type { Type as NumberType }
