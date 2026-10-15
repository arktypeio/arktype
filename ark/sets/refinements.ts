import {
	$ark,
	Disjoint,
	type After,
	type Before,
	type Divisor,
	type ExactLength,
	type IntersectionNode,
	type Max,
	type MaxLength,
	type Min,
	type MinLength,
	type Pattern,
	type Predicate
} from "@ark/schema"
import type { setImplementationOf } from "./implement.ts"

export const pattern: setImplementationOf<Pattern.Declaration> = {
	intersections: {
		// for now, non-equal regex are naively intersected:
		// https://github.com/arktypeio/arktype/issues/853
		pattern: () => null
	}
}

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

export const exactLength: setImplementationOf<ExactLength.Declaration> = {
	intersections: {
		exactLength: (l, r, ctx) =>
			Disjoint.init(
				"unit",
				ctx.$.node("unit", { unit: l.rule }),
				ctx.$.node("unit", { unit: r.rule }),
				{ path: ["length"] }
			),
		minLength: (exactLength, minLength) =>
			exactLength.rule >= minLength.rule ?
				exactLength
			:	Disjoint.init("range", exactLength, minLength),
		maxLength: (exactLength, maxLength) =>
			exactLength.rule <= maxLength.rule ?
				exactLength
			:	Disjoint.init("range", exactLength, maxLength)
	}
}

export const max: setImplementationOf<Max.Declaration> = {
	intersections: {
		max: (l, r) => (l.isStricterThan(r) ? l : r),
		min: (max, min, ctx) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					ctx.$.node("unit", { unit: max.rule })
				:	null
			:	Disjoint.init("range", max, min)
	}
}

export const min: setImplementationOf<Min.Declaration> = {
	intersections: {
		min: (l, r) => (l.isStricterThan(r) ? l : r)
	}
}

export const maxLength: setImplementationOf<MaxLength.Declaration> = {
	reduce: (inner, $) =>
		inner.rule === 0 ? $.node("exactLength", inner) : undefined,
	intersections: {
		maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
		minLength: (max, min, ctx) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					ctx.$.node("exactLength", { rule: max.rule })
				:	null
			:	Disjoint.init("range", max, min)
	}
}

export const minLength: setImplementationOf<MinLength.Declaration> = {
	reduce: inner =>
		inner.rule === 0 ?
			// a minimum length of zero is trivially satisfied
			($ark.intrinsic.unknown as IntersectionNode)
		:	undefined,
	intersections: {
		minLength: (l, r) => (l.isStricterThan(r) ? l : r)
	}
}

export const before: setImplementationOf<Before.Declaration> = {
	intersections: {
		before: (l, r) => (l.isStricterThan(r) ? l : r),
		after: (before, after, ctx) =>
			before.overlapsRange(after) ?
				before.overlapIsUnit(after) ?
					ctx.$.node("unit", { unit: before.rule })
				:	null
			:	Disjoint.init("range", before, after)
	}
}

export const after: setImplementationOf<After.Declaration> = {
	intersections: {
		after: (l, r) => (l.isStricterThan(r) ? l : r)
	}
}

export const predicate: setImplementationOf<Predicate.Declaration> = {
	intersections: {
		// as long as the narrows in l and r are individually safe to check
		// in the order they're specified, checking them in the order
		// resulting from this intersection should also be safe.
		predicate: () => null
	}
}
