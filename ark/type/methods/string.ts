import type {
	ExactLength,
	ExclusiveNumericRangeSchema,
	InclusiveNumericRangeSchema,
	Pattern
} from "@ark/schema"
import type { BaseType } from "./base.ts"
import type { parseRegexp } from "../parser/shift/operand/regexp.js"

/** @ts-ignore cast variance */
interface Type<out t extends string = string, $ = {}> extends BaseType<t, $> {
	matching<const P extends Pattern.Schema>(
		schema: P
	): P extends string ? Type<parseRegexp<P, true>, $> : this

	atLeastLength(schema: InclusiveNumericRangeSchema): this

	atMostLength(schema: InclusiveNumericRangeSchema): this

	moreThanLength(schema: ExclusiveNumericRangeSchema): this

	lessThanLength(schema: ExclusiveNumericRangeSchema): this

	exactlyLength(schema: ExactLength.Schema): this
}

export type { Type as StringType }
