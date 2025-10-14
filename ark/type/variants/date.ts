import type {
	ExclusiveDateRangeSchema,
	InclusiveDateRangeSchema
} from "@ark/schema"
import type { ObjectType } from "./object.ts"

/** @ts-ignore cast variance */
interface Type<out t extends globalThis.Date = globalThis.Date, $ = {}>
	extends ObjectType<t, $> {
	atOrAfter(schema: InclusiveDateRangeSchema): this

	atOrBefore(schema: InclusiveDateRangeSchema): this

	laterThan(schema: ExclusiveDateRangeSchema): this

	earlierThan(schema: ExclusiveDateRangeSchema): this
}

export type { Type as DateType }
