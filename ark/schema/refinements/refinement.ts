import {
	throwParseError,
	type PartialRecord,
	type mutable
} from "@arktype/util"
import type { Node, TypeNode, TypeSchema } from "../base.js"
import type { Disjoint } from "../shared/disjoint.js"
import type {
	BasisKind,
	NodeKind,
	PropRefinementKind,
	RefinementKind,
	ShallowRefinementKind,
	kindRightOf
} from "../shared/implement.js"
import type {
	ConditionalConstraintKind,
	IntersectionInner
} from "../types/intersection.js"

export type ConstraintGroupName = keyof ConstraintKindsByGroup

export type GroupedConstraints = {
	[k in ConstraintGroupName]?: Node<ConstraintKindsByGroup[k]>[]
}

export type ConstraintKindsByGroup = {
	basis: BasisKind
	shallow: ShallowRefinementKind
	props: PropRefinementKind
	predicate: "predicate"
}

export type FoldInput<kind extends RefinementKind> = {
	-readonly [k in Exclude<
		keyof IntersectionInner,
		kindRightOf<kind>
	>]: IntersectionInner[k] extends readonly unknown[] | undefined
		? mutable<IntersectionInner[k]>
		: IntersectionInner[k]
}

export type FoldOutput<kind extends RefinementKind> = FoldInput<kind> | Disjoint

export interface BaseRefinement<kind extends RefinementKind> {
	foldIntersection(into: FoldInput<kind>): FoldOutput<kind>
	// TODO: update
	readonly constraintGroup: ConstraintGroupName
	readonly prerequisiteSchemas: readonly TypeSchema[]
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

const prerequisiteCache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export const createBasisAssertion = (node: Node<ConditionalConstraintKind>) => {
	const prerequisites: readonly TypeNode[] =
		prerequisiteCache[node.kind] ??
		(prerequisiteCache[node.kind] = node.prerequisiteSchemas.map((schema) =>
			node.$.parseTypeNode(schema)
		))
	return (basis: Node<BasisKind> | undefined) => {
		if (prerequisites.length === 1 && prerequisites[0].isUnknown()) {
			return
		}
		if (!prerequisites.some((prerequisite) => basis?.extends(prerequisite))) {
			throwParseError(
				`${node.kind} operand must be of type ${prerequisites.join(
					" or "
				)} (was ${getBasisName(basis)})`
			)
		}
	}
}
