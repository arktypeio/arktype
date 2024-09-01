import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	exclusivizeRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { applyConstraintSchema } from "../keywords/ast.ts"
import type { ObjectType } from "./object.ts"

interface Type<
	/** @ts-ignore cast variance */
	out t extends readonly unknown[] = readonly unknown[],
	$ = {}
> extends ObjectType<t, $> {
	atLeastLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "minLength", schema>, $>

	atMostLength<const schema extends InclusiveNumericRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "maxLength", schema>, $>

	moreThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		applyConstraintSchema<t, "minLength", exclusivizeRangeSchema<schema>>,
		$
	>

	lessThanLength<const schema extends ExclusiveNumericRangeSchema>(
		schema: schema
	): Type<
		applyConstraintSchema<t, "maxLength", exclusivizeRangeSchema<schema>>,
		$
	>

	exactlyLength<const schema extends ExactLength.Schema>(
		schema: schema
	): Type<applyConstraintSchema<t, "exactLength", schema>, $>
}

export type { Type as ArrayType }
