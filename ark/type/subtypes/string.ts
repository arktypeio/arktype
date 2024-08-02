import type {
	ExactLengthSchema,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema,
	PatternSchema
} from "@ark/schema"
import type { parseConstraint } from "../ast.js"
import type { Type as BaseType } from "../type.js"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}> extends BaseType<t, $> {
	matching<const schema extends PatternSchema>(
		schema: schema
	): Type<parseConstraint<t, "pattern", schema>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "minLength", exclusivizeRangeSchema<schema>>, $>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "maxLength", exclusivizeRangeSchema<schema>>, $>

	exactlyLength<const schema extends ExactLengthSchema>(
		schema: schema
	): Type<parseConstraint<t, "exactLength", schema>, $>
}

export type { Type as StringType }
