import type { extend } from "@arktype/util"
import { type Node } from "../node.js"
import type { BasisClassesByKind, BasisKind } from "./basis.js"
import type { RefinementClassesByKind } from "./refinement.js"

export type ConstraintClassesByKind = extend<
	BasisClassesByKind,
	RefinementClassesByKind
>

export type ConstraintKind = keyof ConstraintClassesByKind

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
