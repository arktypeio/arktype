import type { mutable } from "@arktype/util"
import { BaseNode, type Node, type NodeSubclass } from "../base.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	NodeKind,
	PropKind,
	ShallowRefinementKind,
	kindRightOf
} from "../shared/implement.js"
import type { IntersectionInner } from "../types/intersection.js"

export type ConstraintGroupName = keyof ConstraintKindsByGroup

export type GroupedConstraints = {
	[k in ConstraintGroupName]?: Node<ConstraintKindsByGroup[k]>[]
}

export type ConstraintKindsByGroup = {
	basis: BasisKind
	shallow: ShallowRefinementKind
	props: PropKind
	predicate: "predicate"
}

export type FoldInput<kind extends NodeKind> = {
	-readonly [k in Exclude<
		keyof IntersectionInner,
		kindRightOf<kind>
	>]?: IntersectionInner[k] extends readonly unknown[] | undefined
		? mutable<IntersectionInner[k]>
		: IntersectionInner[k]
}

export type FoldOutput<kind extends NodeKind> = FoldInput<kind> | Disjoint

export interface BaseRefinementDeclaration extends BaseNodeDeclaration {
	kind: NodeKind
}

export abstract class BaseRefinement<
	d extends BaseRefinementDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	abstract foldIntersection(into: FoldInput<d["kind"]>): FoldOutput<d["kind"]>
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"
