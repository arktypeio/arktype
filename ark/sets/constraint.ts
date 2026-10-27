import {
	$ark,
	constraintKeys,
	Disjoint,
	type BaseConstraint,
	type BaseNode,
	type BaseProp,
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
	type Key,
	type listable,
	type satisfy
} from "@ark/util"
import { intersectOrPipeNodes } from "./intersections.ts"

const basisOf = (inner: Intersection.Inner): BaseRoot | undefined =>
	inner.proto ?? inner.domain

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
		// a structure with no constraints still checks its undeclared keys
		let result: BaseNode | Disjoint =
			(
				s.l.length === 0 &&
				s.kind === "structure" &&
				(!s.baseInner.undeclared || s.baseInner.undeclared === "ignore")
			) ?
				$ark.intrinsic.unknown.internal
				// an intersection of a basis alone is the basis
			: s.l.length === 0 && s.kind === "intersection" && basisOf(s.baseInner) ?
				basisOf(s.baseInner)!
			:	s.ctx.$.node(
					s.kind,
					Object.assign(s.baseInner, unflattenConstraints(s.l)) as never,
					{ prereduced: true }
				)
		// a root, e.g. an empty array, can only meet the object a structure constrains
		if (s.roots.length && result.is("structure"))
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
				for (const node of s.l[i].impliedBy ?? []) appendUnique(s.r, node)
		} else {
			// a head can narrow two constraints, e.g. <= 1 meeting >= 1 and <= 2
			s.l.splice(i--, 1)
			if (!s.l.includes(result as never)) s.r.push(result as BaseConstraint)
		}
	}
	if (!matched) s.l.push(head)

	if (s.kind === "intersection") {
		if (head.impliedBy)
			for (const node of head.impliedBy) appendUnique(s.r, node)
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
			: compareSiblings(l, r)
		)

	return result
}

export const sortSiblings = <node extends BaseNode>(
	nodes: readonly node[]
): readonly node[] => {
	for (let i = 1; i < nodes.length; i++) {
		if (compareSiblings(nodes[i - 1], nodes[i]) > 0)
			return [...nodes].sort(compareSiblings)
	}
	return nodes
}

// props are ordered by key, so equal structures list them alike without
// writing their values, and since a sibling's hash starts with its kind (a
// union's own doesn't, but unions are never siblings), nodes of different
// kinds order by kind without writing theirs
const compareSiblings = (l: BaseNode, r: BaseNode): number =>
	l.is("required") || l.is("optional") ?
		compareKeys(l.key, (r as BaseProp).key) || compareHashes(l.hash, r.hash)
	: l.kind === r.kind ? compareHashes(l.hash, r.hash)
	: l.kind < r.kind ? -1
	: 1

// a registered name's counter compares as a number, so names order as they
// were registered however many came before
const compareHashes = (l: string, r: string): number => {
	if (l.includes("$ark")) {
		let i = 0
		while (i < l.length && l[i] === r[i]) i++
		const counted = countedName.exec(l.slice(0, i))
		if (counted) {
			const lDigits = counted[1].length + l.slice(i).search(nonDigit)
			const rDigits = counted[1].length + r.slice(i).search(nonDigit)
			if (lDigits && rDigits && lDigits !== rDigits) return lDigits - rDigits
		}
	}
	return l < r ? -1 : 1
}

// a registered name and its counter's digits so far, like `"$ark.fn$1`, its
// quote unescaped
const countedName = /[^\\]"\$ark\d*\.[\w$]*\$(\d*)$/

const nonDigit = /\D|$/

const compareKeys = (l: Key, r: Key): number =>
	typeof l === "symbol" ?
		typeof r === "symbol" ?
			0
		:	1
	: typeof r === "symbol" ? -1
	: l === r ? 0
	: l < r ? -1
	: 1

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
