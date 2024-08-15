import type { DateRangeSchema } from "@ark/schema"
import type { applyConstraint } from "../ast.js"
import type { ObjectType } from "./object.js"

/** @ts-ignore cast variance */
interface Type<out t extends globalThis.Date = globalThis.Date, $ = {}>
	extends ObjectType<t, $> {
	atOrAfter<const schema extends DateRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "after", schema>, $>

	atOrBefore<const schema extends DateRangeSchema>(
		schema: schema
	): Type<applyConstraint<t, "before", schema>, $>
}

export type { Type as DateType }
