import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema,
	Pattern
} from "@ark/schema"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}> extends BaseType<t, $> {
	matching(schema: Pattern.Schema): this

	atLeastLength(schema: InclusiveNumericRangeSchema): this

	atMostLength(schema: InclusiveNumericRangeSchema): this

	moreThanLength(schema: ExclusiveNumericRangeSchema): this

	lessThanLength(schema: ExclusiveNumericRangeSchema): this

	exactlyLength(schema: ExactLength.Schema): this
}

export type { Type as StringType }
