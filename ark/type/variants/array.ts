import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { ObjectType } from "./object.ts"

interface Type<
	/** @ts-ignore cast variance */
	out t extends readonly unknown[] = readonly unknown[],
	$ = {}
> extends ObjectType<t, $> {
	atLeastLength(schema: InclusiveNumericRangeSchema): this

	atMostLength(schema: InclusiveNumericRangeSchema): this

	moreThanLength(schema: ExclusiveNumericRangeSchema): this

	lessThanLength(schema: ExclusiveNumericRangeSchema): this

	exactlyLength(schema: ExactLength.Schema): this
}

export type { Type as ArrayType }
