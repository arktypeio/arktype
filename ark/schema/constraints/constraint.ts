import type { extend } from "@arktype/util"
import { type Node } from "../node.js"
import type { BasisDeclarationsByKind, BasisKind } from "./basis.js"
import type { RefinementDeclarationsByKind } from "./refinement.js"

export type ConstraintDeclarationsByKind = extend<
	BasisDeclarationsByKind,
	RefinementDeclarationsByKind
>

export type ConstraintKind = keyof ConstraintDeclarationsByKind

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
