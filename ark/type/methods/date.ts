import type {
	ExclusiveDateRangeSchema,
	exclusivizeRangeSchema,
	InclusiveDateRangeSchema
} from "@ark/schema"
import type { applyConstraintSchema } from "../keywords/inference.ts"
import type { ObjectType } from "./object.ts"

/** @ts-ignore cast variance */
interface Type<out t extends globalThis.Date = globalThis.Date, $ = {}>
	extends ObjectType<t, $> {
	atOrAfter<const schema extends InclusiveDateRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "after", schema>, $>

	atOrBefore<const schema extends InclusiveDateRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "before", schema>, $>

	laterThan<const schema extends ExclusiveDateRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "after", exclusivizeRangeSchema<schema>>, $>

	earlierThan<const schema extends ExclusiveDateRangeSchema>(
		schema: schema
	): Type<applyConstraintSchema<t, "before", exclusivizeRangeSchema<schema>>, $>
}

export type { Type as DateType }
