import { date, type Arbitrary } from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"

type DateConstraints = { min?: Date; max?: Date }

export const buildDateArbitrary = (ctx: Ctx): Arbitrary<Date> => {
	const dateConstraints: DateConstraints = {}
	if (ctx.refinements.after) dateConstraints.min = ctx.refinements.after
	if (ctx.refinements.before) dateConstraints.max = ctx.refinements.before
	return date(dateConstraints)
}
