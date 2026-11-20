import type {
	MessageConfig,
	ExclusiveDateRangeSchema,
	InclusiveDateRangeSchema
} from "@ark/schema"
import type { ObjectType } from "./object.ts"

/** @ts-ignore cast variance */
interface Type<out t extends globalThis.Date = globalThis.Date, in out $ = {}>
	extends ObjectType<t, $> {
	atOrAfter(
		schema: InclusiveDateRangeSchema,
		message?: MessageConfig<"after">
	): this

	atOrBefore(
		schema: InclusiveDateRangeSchema,
		message?: MessageConfig<"before">
	): this

	laterThan(
		schema: ExclusiveDateRangeSchema,
		message?: MessageConfig<"after">
	): this

	earlierThan(
		schema: ExclusiveDateRangeSchema,
		message?: MessageConfig<"before">
	): this
}

export type { Type as DateType }
