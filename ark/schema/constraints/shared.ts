import type { BasisKind } from "../bases/basis.ts"
import { type Node } from "../nodes.ts"

export interface BaseConstraint {
	implicitBasis: Node<BasisKind>
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
