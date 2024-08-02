import type {
	ExactLengthSchema,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { parseConstraint } from "../ast.js"
import type { ObjectType } from "./object.js"

interface Type<
	/** @ts-ignore cast variance */
	out t extends readonly unknown[] = readonly unknown[],
	$ = {}
> extends ObjectType<t, $> {
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

export type { Type as ArrayType }
