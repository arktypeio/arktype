import {
	$ark,
	constraintInputOf,
	Disjoint,
	type After,
	type BaseRange,
	type Before,
	type Divisor,
	type ExactLength,
	type IntersectionContext,
	type IntersectionNode,
	type Max,
	type MaxLength,
	type Min,
	type MinLength,
	type NotEqual,
	type NotEqualLength,
	type Pattern,
	type Predicate
} from "@ark/schema"
import type { setImplementationOf } from "./implement.ts"

// of two bounds of a kind, the one that rules out more
const stricter = (l: BaseRange<any>, r: BaseRange<any>): never =>
	(l.isStricterThan(r as never) ? l : r) as never

// a bound excluding the value needs no !=, and one including it only as its
// limit becomes exclusive
const excludeFromBound = (
	bound: BaseRange<any>,
	notEqual: NotEqual.Node | NotEqualLength.Node,
	ctx: IntersectionContext
): never => {
	const value = notEqual.rule.valueOf()
	return (
		value === bound.numRule ?
			bound.exclusive ?
				bound
			:	ctx.$.node(
					bound.kind,
					constraintInputOf(bound.kind, { rule: bound.rule, exclusive: true })
				)
		: value > bound.numRule === (bound.limitKind === "upper") ? bound
		: null) as never
}

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
			}),
		notEqual: (divisor, notEqual) =>
			divisor.tAllows(notEqual.numRule) ? null : divisor
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
		notEqualLength: (exactLength, notEqualLength) =>
			exactLength.rule === notEqualLength.rule ?
				Disjoint.init("range", exactLength, notEqualLength)
			:	exactLength,
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
		max: stricter,
		min: (max, min, ctx) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					ctx.$.node("unit", { unit: max.rule })
				:	null
			:	Disjoint.init("range", max, min),
		notEqual: excludeFromBound
	}
}

export const min: setImplementationOf<Min.Declaration> = {
	intersections: {
		min: stricter,
		notEqual: excludeFromBound
	}
}

export const notEqual: setImplementationOf<NotEqual.Declaration> = {
	intersections: {
		notEqual: () => null
	}
}

export const notEqualLength: setImplementationOf<NotEqualLength.Declaration> = {
	// no length is less than 0
	reduce: (inner, $) =>
		inner.rule === 0 ? $.node("minLength", { rule: 1 }) : undefined,
	intersections: {
		notEqualLength: () => null
	}
}

export const maxLength: setImplementationOf<MaxLength.Declaration> = {
	reduce: (inner, $) =>
		inner.rule === 0 ? $.node("exactLength", inner) : undefined,
	intersections: {
		maxLength: stricter,
		minLength: (max, min, ctx) =>
			max.overlapsRange(min) ?
				max.overlapIsUnit(min) ?
					ctx.$.node("exactLength", { rule: max.rule })
				:	null
			:	Disjoint.init("range", max, min),
		notEqualLength: excludeFromBound
	}
}

export const minLength: setImplementationOf<MinLength.Declaration> = {
	reduce: inner =>
		inner.rule === 0 ?
			// a minimum length of zero is trivially satisfied
			($ark.kw.unknown as IntersectionNode)
		:	undefined,
	intersections: {
		minLength: stricter,
		notEqualLength: excludeFromBound
	}
}

export const before: setImplementationOf<Before.Declaration> = {
	intersections: {
		before: stricter,
		after: (before, after, ctx) =>
			before.overlapsRange(after) ?
				before.overlapIsUnit(after) ?
					ctx.$.node("unit", { unit: before.rule })
				:	null
			:	Disjoint.init("range", before, after),
		notEqual: excludeFromBound
	}
}

export const after: setImplementationOf<After.Declaration> = {
	intersections: {
		after: stricter,
		notEqual: excludeFromBound
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
