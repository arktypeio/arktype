import type {
	ExclusiveDateRangeSchema,
	exclusivizeRangeSchema,
	InclusiveDateRangeSchema
} from "@ark/schema"
import type { parseConstraint } from "../ast.js"
import type { ObjectType } from "./object.js"

/** @ts-ignore cast variance */
interface Type<out t extends globalThis.Date = globalThis.Date, $ = {}>
	extends ObjectType<t, $> {
	atOrAfter<const schema extends InclusiveDateRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "after", schema>, $>

	atOrBefore<const schema extends InclusiveDateRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "before", schema>, $>

	laterThan<const schema extends ExclusiveDateRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "after", exclusivizeRangeSchema<schema>>, $>

	earlierThan<const schema extends ExclusiveDateRangeSchema>(
		schema: schema
	): Type<parseConstraint<t, "before", exclusivizeRangeSchema<schema>>, $>
}

export type { Type as DateType }
