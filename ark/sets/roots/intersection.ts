import {
	$ark,
	Disjoint,
	type BaseConstraint,
	type BaseRoot,
	type BaseScope,
	type Intersection,
	type IntersectionContext,
	type NotEqual,
	type NotEqualLength,
	type nodeOfKind
} from "@ark/schema"
import {
	flattenConstraints,
	flattenInner,
	intersectConstraints,
	sortSiblings
} from "../constraint.ts"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"
import { intersectOrPipeNodes, listsKeysAlike } from "../intersections.ts"

export const intersection: setImplementationOf<Intersection.Declaration> = {
	// predicates keep their order, since each narrows the input of the next
	sort: inner => {
		if (inner.pattern) inner.pattern = sortSiblings(inner.pattern)
		if (inner.notEqual) inner.notEqual = sortExcluded(inner.notEqual)
		if (inner.notEqualLength)
			inner.notEqualLength = sortExcluded(inner.notEqualLength)
	},
	// leverage reduction logic from intersection and identity to ensure initial
	// parse result is reduced
	reduce: (inner, $) =>
		// we cast union out of the result here since that only occurs when intersecting two sequences
		// that cannot occur when reducing a single intersection schema using unknown
		intersectIntersections({}, inner, {
			$,
			invert: false,
			pipe: false
		}) as nodeOfKind<"intersection" | Intersection.BasisKind>,
	intersections: {
		intersection: (l, r, ctx) =>
			intersectIntersections(l.inner, r.inner, ctx, flattenInner),
		...defineRightwardIntersections("intersection", (l, r, ctx) => {
			// if l is unknown, return r
			if (l.children.length === 0) return r

			const { domain, proto, ...lInnerConstraints } = l.inner

			const lBasis = proto ?? domain

			if (!lBasis) {
				const disjoint = disjointFromImplied(
					l.children as BaseConstraint[],
					r,
					ctx
				)
				if (disjoint) return disjoint
			}

			const basis = lBasis ? intersectOrPipeNodes(lBasis, r, ctx) : r

			return (
				basis instanceof Disjoint ? basis
				: l?.basis?.equals(basis) ?
					// if the basis doesn't change, return the original intesection
					l
					// given we've already precluded l being unknown, the result must
					// be an intersection with the new basis result integrated
				:	l.$.node(
						"intersection",
						{ ...lInnerConstraints, [basis.kind]: basis },
						{ reduced: true }
					)
			)
		})
	}
}

// excluded values are listed in order
const sortExcluded = <node extends NotEqual.Node | NotEqualLength.Node>(
	nodes: readonly node[]
): readonly node[] =>
	[...nodes].sort((l, r) => l.rule.valueOf() - r.rule.valueOf())

export const constrainIntersection = (
	l: Intersection.Node,
	inner: Intersection.Inner,
	$: BaseScope
): BaseRoot | Disjoint => {
	const result = intersectIntersections(l.inner, inner, {
		$,
		invert: false,
		pipe: false
	})
	if (result instanceof Disjoint) return result
	return (
		$ark.sets!.disjointOf?.(result) ??
		(l.equals(result) && listsKeysAlike(l, result) ? l : result)
	)
}

const intersectIntersections = (
	l: Intersection.Inner,
	r: Intersection.Inner,
	ctx: IntersectionContext,
	flatten = flattenConstraints
): BaseRoot | Disjoint => {
	const baseInner: Intersection.Inner.mutable = {}

	const lBasis = l.proto ?? l.domain
	const rBasis = r.proto ?? r.domain
	const basisResult =
		lBasis ?
			rBasis ?
				(intersectOrPipeNodes(
					lBasis,
					rBasis,
					ctx
				) as nodeOfKind<Intersection.BasisKind>)
			:	lBasis
		:	rBasis
	if (basisResult instanceof Disjoint) return basisResult

	if (basisResult) baseInner[basisResult.kind] = basisResult as never

	const lConstraints = flatten(l)
	const rConstraints = flatten(r)

	if (lBasis ? !rBasis : rBasis) {
		const disjoint =
			lBasis ?
				disjointFromImplied(rConstraints, lBasis, ctx)?.invert()
			:	disjointFromImplied(lConstraints, rBasis!, ctx)
		if (disjoint) return disjoint
	}

	return intersectConstraints({
		kind: "intersection",
		baseInner,
		l: lConstraints,
		r: rConstraints,
		roots: [],
		ctx
	})
}

// a discriminant prunes the basis its case has checked, leaving constraints
// that hold only of what the basis they imply allows, so they're disjoint from
// a basis that excludes it, as they were before it was pruned
const disjointFromImplied = (
	constraints: readonly BaseConstraint[],
	basis: BaseRoot,
	ctx: IntersectionContext
): Disjoint | undefined => {
	for (const constraint of constraints) {
		if (!constraint.implied) continue
		const result = intersectOrPipeNodes(constraint.implied, basis, ctx)
		if (result instanceof Disjoint) return result
	}
}
