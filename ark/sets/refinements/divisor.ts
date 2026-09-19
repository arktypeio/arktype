import type { Divisor } from "@ark/schema"
import type { setImplementationOf } from "../implement.ts"

export const divisor: setImplementationOf<Divisor.Declaration> = {
	intersections: {
		divisor: (l, r, ctx) =>
			ctx.$.node("divisor", {
				rule: Math.abs(
					(l.rule * r.rule) / greatestCommonDivisor(l.rule, r.rule)
				)
			})
	}
}

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
	let previous: number
	let greatestCommonDivisor = l
	let current = r
	while (current !== 0) {
		previous = current
		current = greatestCommonDivisor % current
		greatestCommonDivisor = previous
	}
	return greatestCommonDivisor
}
