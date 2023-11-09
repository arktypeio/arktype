import type { BasisKind } from "../bases/basis.js"
import { type Node } from "../nodes.js"

export interface BaseConstraint {
	implicitBasis: Node<BasisKind>
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
