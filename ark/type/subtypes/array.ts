import type { ExactLength, InclusiveNumericRangeSchema } from "@ark/schema"
import type { applyConstraint } from "../ast.js"
import type { ObjectType } from "./object.js"

interface Type<
	/** @ts-ignore cast variance */
	out t extends readonly unknown[] = readonly unknown[],
	$ = {}
> extends ObjectType<t, $> {
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

export type { Type as ArrayType }
