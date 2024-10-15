import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { associateAttributesFromSchema } from "../attributes.ts"
import type { ObjectType } from "./object.ts"

interface Type<
	/** @ts-ignore cast variance */
	out t extends readonly unknown[] = readonly unknown[],
	$ = {}
> extends ObjectType<t, $> {
	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<associateAttributesFromSchema<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<associateAttributesFromSchema<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		associateAttributesFromSchema<
			t,
			"minLength",
			exclusivizeRangeSchema<schema>
		>,
		$
	>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		associateAttributesFromSchema<
			t,
			"maxLength",
			exclusivizeRangeSchema<schema>
		>,
		$
	>

	exactlyLength<const schema extends ExactLength.Schema>(
		schema: schema
	): Type<associateAttributesFromSchema<t, "exactLength", schema>, $>
}

export type { Type as ArrayType }
