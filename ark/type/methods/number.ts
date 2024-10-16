import type {
	Divisor,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { associateAttributesFromSchema } from "../attributes.ts"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends number = number, $ = {}> extends BaseType<t, $> {
	divisibleBy<const schema extends Divisor.Schema>(
		schema: schema
	): Type<associateAttributesFromSchema<t, "divisor", schema>, $>

	atLeast<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<associateAttributesFromSchema<t, "min", schema>, $>

	atMost<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<associateAttributesFromSchema<t, "max", schema>, $>

	moreThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		associateAttributesFromSchema<t, "min", exclusivizeRangeSchema<schema>>,
		$
	>

	lessThan<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		associateAttributesFromSchema<t, "max", exclusivizeRangeSchema<schema>>,
		$
	>
}

export type { Type as NumberType }
