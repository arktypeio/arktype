import {
	$ark,
	constraintKeys,
	Disjoint,
	type Alias,
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
	// constraints in s.l / s.r that did not come unmodified from the original
	// l / r operand, so a disjoint involving them cannot be attributed to l vs r
	derivedL?: Set<BaseConstraint>
	derivedR?: Set<BaseConstraint>
	ctx: IntersectionContext
}

const asOptionalDisjoint = (disjoint: Disjoint): Disjoint =>
	new Disjoint(...disjoint.map(entry => ({ ...entry, optional: true })))

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
				$ark.kw.unknown.internal
				// an intersection of a basis alone is the basis
			: s.l.length === 0 && s.kind === "intersection" && basisOf(s.baseInner) ?
				basisOf(s.baseInner)!
			:	s.ctx.$.node(
					s.kind,
					Object.assign(s.baseInner, unflattenConstraints(s.l)) as never,
					{ reduced: true }
				)
		// a root, e.g. an empty array, can only meet the object a structure constrains
		if (s.roots.length && result.is("structure"))
			result = s.ctx.$.node("intersection", { structure: result })

		for (const root of s.roots) {
			result = intersectOrPipeNodes(root, result, s.ctx)!
			if (result instanceof Disjoint) return asOptionalDisjoint(result)
		}

		return result as never
	}
	let matched = false
	for (let i = 0; i < s.l.length; i++) {
		const result: BaseNode | Disjoint | null = intersectOrPipeNodes(
			s.l[i],
			head,
			s.ctx
		)
		if (result === null) continue
		if (result instanceof Disjoint) {
			return s.derivedR?.has(head) || s.derivedL?.has(s.l[i]) ?
					asOptionalDisjoint(result)
				:	result
		}

		if (result.isRoot()) {
			s.roots.push(result)
			s.l.splice(i, 1)
			return intersectConstraints(s)
		}

		// a refinement narrowed to a new one can meet a sibling it didn't, e.g.
		// >= 3 meeting != 3 is > 3, which meets <= 4 as == 4, so it meets each
		// sibling again. One that's either operand has met each already
		const isNarrowedRefinement =
			s.kind === "intersection" && result !== s.l[i] && result !== head
		if (matched || isNarrowedRefinement) {
			// a head can narrow two constraints, e.g. <= 1 meeting >= 1 and <= 2
			s.l.splice(i--, 1)
			if (!s.l.includes(result as never)) {
				if (result !== head || s.derivedR?.has(head))
					(s.derivedR ??= new Set()).add(result as BaseConstraint)
				s.r.push(result as BaseConstraint)
			}
		} else {
			if (result !== s.l[i])
				(s.derivedL ??= new Set()).add(result as BaseConstraint)
			s.l[i] = result as BaseConstraint
			// a sequence narrowed by the intersection implies its own length
			if (s.kind === "intersection") {
				for (const node of s.l[i].impliedBy ?? []) {
					;(s.derivedR ??= new Set()).add(node)
					appendUnique(s.r, node)
				}
			}
		}
		matched = true
	}
	if (!matched) {
		;(s.derivedL ??= new Set()).add(head)
		s.l.push(head)
	}

	if (s.kind === "intersection") {
		if (head.impliedBy) {
			const headDerived = s.derivedR?.has(head)
			for (const node of head.impliedBy) {
				if (headDerived) (s.derivedR ??= new Set()).add(node)
				appendUnique(s.r, node)
			}
		}
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

// props order by key, so equal structures list them alike without writing
// their values; other siblings' hashes start with their kind, so kinds order
// without writing theirs
const compareSiblings = (l: BaseNode, r: BaseNode): number =>
	l.is("required") || l.is("optional") ?
		compareKeys(l.key, (r as BaseProp).key) || compareHashes(l.hash, r.hash)
	: l.kind < r.kind ? -1
	: l.kind > r.kind ? 1
	: l.is("alias") ? compareAliases(l, r as Alias.Node)
	: compareHashes(l.hash, r.hash)

// an operation's alias hashes as its reference, which names its operands by
// node id, e.g. `unit57&intersection88` for a unit deferred beside a cycle.
// An id counts every node created before it, so ordering by it ordered
// `(true&fn) | (undefined&fn)` by which tests ran first. Operations order by
// their operator and operands instead, as the operands do by their content
const compareAliases = (l: Alias.Node, r: Alias.Node): number => {
	if (!l.operands || !r.operands) {
		return (
			l.operands ? 1
			: r.operands ? -1
			: compareHashes(l.hash, r.hash)
		)
	}
	if (l.operator !== r.operator) return l.operator! < r.operator! ? -1 : 1
	const lOperands = sortSiblings(l.operands)
	const rOperands = sortSiblings(r.operands)
	for (let i = 0; i < lOperands.length && i < rOperands.length; i++) {
		const order = compareSiblings(lOperands[i], rOperands[i])
		if (order) return order
	}
	return lOperands.length - rOperands.length || compareHashes(l.hash, r.hash)
}

// a counter compares as a number: a registered name's, so names order as
// registered, and an id's, so the types aliases name order as defined. As
// text, type10 is before type9
const compareHashes = (l: string, r: string): number => {
	if (l.includes("$ark")) {
		let i = 0
		while (i < l.length && l[i] === r[i]) i++
		const reference = sharedReference.exec(l.slice(0, i))
		if (reference) {
			l = padCounters(l.slice(reference.index))
			r = padCounters(r.slice(reference.index))
		}
	}
	return l < r ? -1 : 1
}

// a reference up to where two hashes differ in it, like `"$ark.fn$1` or
// `"$ark.type8&type1`, its quote unescaped
const sharedReference = /[^\\]"\$ark\d*\.[\w$&<=>]*$/

// padded to one length, counters compare as text as they do as numbers
export const padCounters = (reference: string): string =>
	reference.replace(counter, padCounter)

// the digits after a `$`, or those ending an id: a name's own, like a1's in
// a1_3, aren't one
const counter = /\$\d+|\d+(?![\w$])/g

const padCounter = (digits: string): string =>
	digits[0] === "$" ?
		`$${digits.slice(1).padStart(16, "0")}`
	:	digits.padStart(16, "0")

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
		if (constraint.canStack()) {
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
