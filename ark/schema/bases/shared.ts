import { type ConstraintKind } from "../constraints/constraint.js"
import { Disjoint } from "../disjoint.js"
import { type Node } from "../nodes.js"
import { IntersectionNode } from "../sets/intersection.js"
import { type BasisKind } from "./basis.js"

export const intersectBasisAndConstraint = (
	basis: Node<BasisKind>,
	constraint: Node<ConstraintKind>
) => {
	const basisIntersection = constraint.implicitBasis
		? basis.intersect(constraint.implicitBasis)
		: basis
	return basisIntersection instanceof Disjoint
		? basisIntersection
		: new IntersectionNode({
				intersection: [basisIntersection, constraint]
		  })
}
