import { date, type Arbitrary } from "fast-check"
import type { Ctx } from "../arktypeFastCheck.ts"

type DateConstraints = { min?: Date; max?: Date }

export const buildDateArbitrary = (ctx: Ctx): Arbitrary<Date> => {
	const remappedConstraints: DateConstraints = {}
	if (ctx.refinements.after) remappedConstraints.min = ctx.refinements.after
	if (ctx.refinements.before) remappedConstraints.max = ctx.refinements.before
	return date(remappedConstraints)
}
