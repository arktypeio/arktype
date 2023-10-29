import type { BasisKind } from "../bases/basis.js"
import { type Node } from "../nodes.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
