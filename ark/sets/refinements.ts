import {
	$ark,
	boundUnitKeys,
	constraintInputOf,
	Disjoint,
	isCustomBoundUnit,
	preferBoundUnit,
	sameBoundUnit,
	type After,
	type BaseConstraint,
	type BaseRange,
	type Before,
	type BoundUnit,
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
import { isKeyOf } from "@ark/util"
import type { setImplementationOf } from "./implement.ts"
import { boundUnitOf } from "./intersections.ts"

const preferredUnitFor = (
	winnerUnit: BoundUnit | undefined,
	otherUnit: BoundUnit | undefined
): BoundUnit | undefined =>
	isCustomBoundUnit(winnerUnit) ? winnerUnit
	: isCustomBoundUnit(otherUnit) ? otherUnit
	: (winnerUnit ?? otherUnit)

const withPreferredUnit = <node extends BaseConstraint | BaseRange<any>>(
	winner: node,
	other: BaseConstraint | BaseRange<any>,
	ctx: IntersectionContext
): node => {
	const target = winner as BaseConstraint
	if (!isKeyOf(target.kind, boundUnitKeys)) return winner
	const winnerUnit = boundUnitOf(target)
	const unit = preferredUnitFor(
		winnerUnit,
		boundUnitOf(other as BaseConstraint)
	)
	if (sameBoundUnit(unit, winnerUnit)) return winner
	return ctx.$.node(
		target.kind,
		{ ...target.inner, unit, meta: target.meta } as never,
		{ reduced: true }
	) as never
}

const stricter = (
	l: BaseRange<any>,
	r: BaseRange<any>,
	ctx: IntersectionContext
): never =>
	(r.isStricterThan(l as never) ?
		withPreferredUnit(r, l, ctx)
	:	withPreferredUnit(l, r, ctx)) as never

// a bound excluding the value needs no !=, and one including it only as its
// limit becomes exclusive
const excludeFromBound = (
	bound: BaseRange<any>,
	notEqual: NotEqual.Node | NotEqualLength.Node,
	ctx: IntersectionContext
): never => {
	const value = notEqual.rule.valueOf()
	const unit =
		isKeyOf(bound.kind, boundUnitKeys) ?
			preferredUnitFor(boundUnitOf(bound as never), notEqual.unit)
		:	undefined
	return (
		value === bound.numRule ?
			bound.exclusive ?
				withPreferredUnit(bound, notEqual, ctx)
			:	ctx.$.node(
					bound.kind,
					constraintInputOf(bound.kind, {
						rule: bound.rule,
						exclusive: true,
						...(unit ? { unit } : {})
					})
				)
		: value > bound.numRule === (bound.limitKind === "upper") ?
			withPreferredUnit(bound, notEqual, ctx)
		:	null) as never
}

export const pattern: setImplementationOf<Pattern.Declaration> = {
	intersections: {
		// for now, non-equal regex are naively intersected:
		// https://github.com/arktypeio/arktype/issues/853
		pattern: () => null
	}
}

export const divisor: setImplementationOf<Divisor.Declaration> = {
	// data % -n is 0 exactly where data % n is
	reduce: (inner, $) =>
		inner.rule < 0 ? $.node("divisor", { rule: -inner.rule }) : undefined,
	intersections: {
		divisor: (l, r, ctx) => {
			const rule = leastCommonMultipleOf(l.rule, r.rule)
			// no double but 0 is a multiple of an integer no double can hold
			return rule === undefined ?
					ctx.$.node("unit", { unit: 0 })
				:	ctx.$.node("divisor", { rule })
		},
		notEqual: (divisor, notEqual) =>
			divisor.tAllows(notEqual.numRule) ? null : divisor
	}
}

// the least common multiple of two integers, or undefined if no double holds
// it exactly. Computed as a bigint, since l * r can exceed
// Number.MAX_SAFE_INTEGER, rounding to a number neither divides.
//
// A nonzero double is an odd integer below 2^53 times a power of 2. If the
// multiple is a double, data % multiple is exact. If it isn't, its odd part is
// at least 2^53, so it divides no double's odd part, and only 0 is a multiple
// of both
const leastCommonMultipleOf = (l: number, r: number): number | undefined => {
	const lBig = BigInt(Math.abs(l))
	const rBig = BigInt(Math.abs(r))
	const multiple = (lBig / greatestCommonDivisorOf(lBig, rBig)) * rBig
	const rounded = Number(multiple)
	return BigInt(rounded) === multiple ? rounded : undefined
}

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisorOf = (l: bigint, r: bigint): bigint => {
	while (r !== 0n) [l, r] = [r, l % r]
	return l
}

export const exactLength: setImplementationOf<ExactLength.Declaration> = {
	intersections: {
		exactLength: (l, r, ctx) =>
			l.rule === r.rule ?
				withPreferredUnit(l, r, ctx)
			:	Disjoint.init(
					"unit",
					ctx.$.node("unit", { unit: l.rule }),
					ctx.$.node("unit", { unit: r.rule }),
					{ path: ["length"] }
				),
		notEqualLength: (exactLength, notEqualLength, ctx) =>
			exactLength.rule === notEqualLength.rule ?
				Disjoint.init("range", exactLength, notEqualLength)
			:	withPreferredUnit(exactLength, notEqualLength, ctx),
		minLength: (exactLength, minLength, ctx) =>
			exactLength.rule >= minLength.rule ?
				withPreferredUnit(exactLength, minLength, ctx)
			:	Disjoint.init("range", exactLength, minLength),
		maxLength: (exactLength, maxLength, ctx) =>
			exactLength.rule <= maxLength.rule ?
				withPreferredUnit(exactLength, maxLength, ctx)
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
		notEqual: (l, r, ctx) => (l.equals(r) ? withPreferredUnit(l, r, ctx) : null)
	}
}

export const notEqualLength: setImplementationOf<NotEqualLength.Declaration> = {
	// no length is less than 0
	reduce: (inner, $) =>
		inner.rule === 0 ?
			$.node("minLength", {
				rule: 1,
				...(inner.unit ? { unit: inner.unit } : {})
			})
		:	undefined,
	intersections: {
		notEqualLength: (l, r, ctx) =>
			l.rule === r.rule ? withPreferredUnit(l, r, ctx) : null
	}
}

export const maxLength: setImplementationOf<MaxLength.Declaration> = {
	reduce: (inner, $) =>
		inner.rule === 0 ? $.node("exactLength", inner) : undefined,
	intersections: {
		maxLength: stricter,
		minLength: (max, min, ctx) => {
			if (!max.overlapsRange(min)) return Disjoint.init("range", max, min)
			if (!max.overlapIsUnit(min)) return null
			const unit = preferBoundUnit(max.unit, min.unit)
			return ctx.$.node("exactLength", {
				rule: max.rule,
				...(unit ? { unit } : {})
			})
		},
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
