import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema,
	Pattern
} from "@ark/schema"
import type { associateAttributesFromStringSchema } from "../attributes.ts"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}> extends BaseType<t, $> {
	matching<const schema extends Pattern.Schema>(
		schema: schema
	): Type<associateAttributesFromStringSchema<t, "pattern", schema>, $>

	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<associateAttributesFromStringSchema<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<associateAttributesFromStringSchema<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		associateAttributesFromStringSchema<
			t,
			"minLength",
			exclusivizeRangeSchema<schema>
		>,
		$
	>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		associateAttributesFromStringSchema<
			t,
			"maxLength",
			exclusivizeRangeSchema<schema>
		>,
		$
	>

	exactlyLength<const schema extends ExactLength.Schema>(
		schema: schema
	): Type<associateAttributesFromStringSchema<t, "exactLength", schema>, $>
}

export type { Type as StringType }
