import { BaseNode, type Node, type NodeSubclass } from "../../base.js"
import type { BaseNodeDeclaration } from "../../shared/declare.js"
import type { BasisKind, PropKind } from "../../shared/implement.js"

export interface BasePropDeclaration extends BaseNodeDeclaration {
	kind: PropKind
}

export abstract class BasePropConstraint<
	d extends BasePropDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	get hasOpenIntersection() {
		return this.impl.hasOpenIntersection as d["hasOpenIntersection"]
	}
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
