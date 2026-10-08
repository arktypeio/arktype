import {
	$ark,
	constraintKeys,
	Disjoint,
	type BaseConstraint,
	type BaseNode,
	type BaseRoot,
	type Intersection,
	type IntersectionContext,
	type NodeKind,
	type RootKind,
	type Structure,
	type nodeOfKind
} from "@ark/schema"
import {
	append,
	appendUnique,
	throwInternalError,
	type array,
	type listable,
	type satisfy
} from "@ark/util"
import { intersectOrPipeNodes } from "./intersections.ts"

type ConstraintGroupKind = satisfy<NodeKind, "intersection" | "structure">

interface ConstraintIntersectionState<
	kind extends ConstraintGroupKind = ConstraintGroupKind
> {
	kind: kind
	baseInner: Record<string, unknown>
	l: BaseConstraint[]
	r: BaseConstraint[]
	roots: BaseRoot[]
	ctx: IntersectionContext
}

export const intersectConstraints = <kind extends ConstraintGroupKind>(
	s: ConstraintIntersectionState<kind>
): nodeOfKind<RootKind | Extract<kind, "structure">> | Disjoint => {
	const head = s.r.shift()
	if (!head) {
		let result: BaseNode | Disjoint =
			s.l.length === 0 && s.kind === "structure" ?
				$ark.intrinsic.unknown.internal
			:	s.ctx.$.node(
					s.kind,
					Object.assign(s.baseInner, unflattenConstraints(s.l)),
					{ prereduced: true }
				)
		// a root, e.g. an empty array, can only meet the object a structure constrains
		if (s.roots.length && result.hasKind("structure"))
			result = s.ctx.$.node("intersection", { structure: result })

		for (const root of s.roots) {
			if (result instanceof Disjoint) return result

			result = intersectOrPipeNodes(root, result, s.ctx)!
		}

		return result as never
	}
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result = intersectOrPipeNodes(s.l[i], head, s.ctx)
		if (result === null) continue
		if (result instanceof Disjoint) return result

		if (result.isRoot()) {
			s.roots.push(result)
			s.l.splice(i, 1)
			return intersectConstraints(s)
		}

		if (!matched) {
			s.l[i] = result as BaseConstraint
			matched = true
			// a sequence narrowed by the intersection implies its own length
			if (s.kind === "intersection")
				for (const node of s.l[i].impliedSiblings ?? []) appendUnique(s.r, node)
		} else {
			// a head can narrow two constraints, e.g. <= 1 meeting >= 1 and <= 2
			s.l.splice(i--, 1)
			if (!s.l.includes(result as never)) s.r.push(result as BaseConstraint)
		}
	}
	if (!matched) s.l.push(head)

	if (s.kind === "intersection") {
		if (head.impliedSiblings)
			for (const node of head.impliedSiblings) appendUnique(s.r, node)
	}
	return intersectConstraints(s)
}

export const flattenConstraints = (inner: object): BaseConstraint[] => {
	const result = Object.entries(inner)
		.flatMap(([k, v]) =>
			k in constraintKeys ? (v as listable<BaseConstraint>) : []
		)
		.sort((l, r) =>
			l.precedence < r.precedence ? -1
			: l.precedence > r.precedence ? 1
				// preserve order for predicates
			: l.kind === "predicate" && r.kind === "predicate" ? 0
			: l.hash < r.hash ? -1
			: 1
		)

	return result
}

type FlatIntersectionInner = Intersection.Inner & Structure.Inner

type MutableFlatIntersectionInner = Intersection.Inner.mutable &
	Structure.Inner.mutable

export const unflattenConstraints = (
	constraints: array<BaseConstraint>
): FlatIntersectionInner => {
	const inner: MutableFlatIntersectionInner = {}
	for (const constraint of constraints) {
		if (constraint.hasOpenIntersection()) {
			inner[constraint.kind] = append(
				inner[constraint.kind],
				constraint
			) as never
		} else {
			if (inner[constraint.kind]) {
				return throwInternalError(
					`Unexpected intersection of closed refinements of kind ${constraint.kind}`
				)
			}
			inner[constraint.kind] = constraint as never
		}
	}
	return inner
}
