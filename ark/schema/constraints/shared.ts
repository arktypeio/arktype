import type { BasisKind } from "../bases/basis.js"
import { Disjoint } from "../disjoint.js"
import { type Node } from "../nodes.js"
import { IntersectionNode } from "../sets/intersection.js"
import { type ConstraintKind } from "./constraint.js"

export interface BaseConstraint {
	implicitBasis: Node<BasisKind>
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
