import type {
	Divisor,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema
} from "@ark/schema"
import type { BaseType } from "./base.ts"

/** @ts-ignore cast variance */
interface Type<out t extends number = number, $ = {}> extends BaseType<t, $> {
	divisibleBy(schema: Divisor.Schema): this

	atLeast(schema: InclusiveNumericRangeSchema): this

	atMost(schema: InclusiveNumericRangeSchema): this

	moreThan(schema: ExclusiveNumericRangeSchema): this

	lessThan(schema: ExclusiveNumericRangeSchema): this
}

export type { Type as NumberType }
