import {
	Disjoint,
	type BaseRoot,
	type Intersection,
	type IntersectionContext,
	type NotEqual,
	type NotEqualLength,
	type nodeOfKind
} from "@ark/schema"
import {
	flattenConstraints,
	intersectConstraints,
	sortSiblings
} from "../constraint.ts"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"

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
		intersection: (l, r, ctx) => intersectIntersections(l.inner, r.inner, ctx),
		...defineRightwardIntersections("intersection", (l, r, ctx) => {
			// if l is unknown, return r
			if (l.children.length === 0) return r

			const { domain, proto, ...lInnerConstraints } = l.inner

			const lBasis = proto ?? domain

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

const intersectIntersections = (
	l: Intersection.Inner,
	r: Intersection.Inner,
	ctx: IntersectionContext
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

	return intersectConstraints({
		kind: "intersection",
		baseInner,
		l: flattenConstraints(l),
		r: flattenConstraints(r),
		roots: [],
		ctx
	})
}
