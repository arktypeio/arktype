import {
	$ark,
	Disjoint,
	normalizeIndex,
	writeDuplicateKeyMessage,
	type BaseRoot,
	type BaseScope,
	type OptionalNode,
	type Structure,
	type nodeOfKind
} from "@ark/schema"
import { throwParseError, type Key } from "@ark/util"
import {
	flattenConstraints,
	intersectConstraints,
	sortSiblings
} from "../constraint.ts"
import type { setImplementationOf } from "../implement.ts"
import { intersectNodesRoot } from "../intersections.ts"

const intersectPropsAndIndex = <
	l extends nodeOfKind<"required"> | nodeOfKind<"optional">
>(
	l: l,
	r: nodeOfKind<"index">,
	$: BaseScope
): l | Disjoint | null => {
	const kind = l.required ? "required" : "optional"

	// a signature reading ctx can only decide a key it's traversing
	if (r.signature.allowsRequiresContext || !r.signature.allows(l.key))
		return null

	// a key's transforms apply in turn once each value allows its input
	const value =
		l.value.includesTransform && r.value.includesTransform ?
			intersectNodesRoot(l.value.rawIn, r.value.rawIn, $)
		:	intersectNodesRoot(l.value, r.value, $)
	if (value instanceof Disjoint) {
		// absent, since one of the disjoint values rejects undefined
		return kind === "optional" ?
				($.node(
					"optional",
					{ key: l.key, value: $ark.intrinsic.never.internal },
					{ prereduced: true }
				) as l)
				// optional, since an index signature doesn't require the key
			:	value.withPrefixKey(l.key, "optional")
	}

	return null
}

// a number key names the same property as its string
const propertyOf = (key: Key): Key =>
	typeof key === "symbol" ? key : String(key)

// "reject" checks string keys only, so it allows any symbol key
const allowedKeysOf = (node: Structure.Node): BaseRoot =>
	node.undeclared === "reject" ?
		node.keyof().rawOr($ark.intrinsic.symbol.internal)
	:	node.keyof()

// narrows other's optional props and index signatures to the keys a
// structure with undeclared keys allows, adding a disjoint for each required
// key it doesn't
const narrowToKeysOf = (
	node: Structure.Node,
	other: Structure.Node,
	otherInner: {
		optional?: readonly OptionalNode[]
		index?: readonly nodeOfKind<"index">[]
	},
	derived: OptionalNode[],
	disjoint: Disjoint,
	$: BaseScope,
	isLeft: boolean
): void => {
	const keys = allowedKeysOf(node)
	for (const k of other.requiredKeys) {
		if (keys.allows(k)) continue
		const value = other.propsByKey[k]!.value
		const never = $ark.intrinsic.never.internal
		disjoint.add("presence", isLeft ? never : value, isLeft ? value : never, {
			path: [k]
		})
	}
	if (otherInner.optional)
		otherInner.optional = otherInner.optional.filter(n => keys.allows(n.key))
	if (otherInner.index) {
		otherInner.index = otherInner.index.flatMap(n => {
			if (n.signature.extends(keys)) return n
			const overlap = intersectNodesRoot(keys, n.signature, $)
			if (overlap instanceof Disjoint) return []
			const normalized = normalizeIndex(overlap, n.value, $)
			// an index's value, which a loose scope doesn't widen
			for (const prop of normalized.required ?? [])
				derived.push($.node("optional", prop.inner, { prereduced: true }))
			derived.push(...(normalized.optional ?? []))
			return normalized.index ?? []
		})
	}
}

export const structure: setImplementationOf<Structure.Declaration> = {
	sort: inner => {
		if (inner.required) inner.required = sortSiblings(inner.required)
		if (inner.optional) inner.optional = sortSiblings(inner.optional)
		if (inner.index) inner.index = sortSiblings(inner.index)
	},
	intersections: {
		structure: (l, r, ctx) => {
			const lInner = { ...l.inner }
			const rInner = { ...r.inner }
			const disjointResult = new Disjoint()
			// props an index signature narrows to once the other side's keys
			// are known. they can't be added to the side they came from, where
			// a prop with the same key would never be merged with them
			const lDerived: OptionalNode[] = []
			const rDerived: OptionalNode[] = []
			if (l.undeclared)
				narrowToKeysOf(l, r, rInner, rDerived, disjointResult, ctx.$, true)
			if (r.undeclared)
				narrowToKeysOf(r, l, lInner, lDerived, disjointResult, ctx.$, false)

			const baseInner: Structure.Inner.mutable = {}

			if (l.undeclared || r.undeclared) {
				baseInner.undeclared =
					l.undeclared === "reject" || r.undeclared === "reject" ?
						"reject"
					:	"delete"
			}

			const childIntersectionResult = intersectConstraints({
				kind: "structure",
				baseInner,
				l: flattenConstraints(lInner),
				// l's derived props precede r's constraints to meet them as l operands
				r: [...lDerived, ...flattenConstraints(rInner), ...rDerived],
				roots: [],
				ctx
			})

			if (childIntersectionResult instanceof Disjoint)
				disjointResult.push(...childIntersectionResult)

			if (disjointResult.length) return disjointResult

			// a prop meets the other side's index signatures as in one literal
			if ((l.index && r.props.length) || (r.index && l.props.length)) {
				return (
					structure.reduce!(
						(childIntersectionResult as Structure.Node).inner,
						ctx.$
					) ?? childIntersectionResult
				)
			}

			return childIntersectionResult
		}
	},
	reduce: (inner, $) => {
		if (!inner.required && !inner.optional) return

		const seen = new Set<Key>()
		let updated = false
		const newOptionalProps: OptionalNode[] =
			inner.optional ? [...inner.optional] : []

		// required keys precede optional ones, each checked for duplicates
		// and against index signatures
		const required = inner.required ?? []
		const props = inner.optional ? [...required, ...inner.optional] : required
		for (let i = 0; i < props.length; i++) {
			const prop = props[i]
			const key = propertyOf(prop.key)
			if (seen.has(key)) throwParseError(writeDuplicateKeyMessage(prop.key))
			seen.add(key)
			if (!inner.index) continue
			for (const index of inner.index) {
				const intersection = intersectPropsAndIndex(prop, index, $)
				if (intersection instanceof Disjoint) return intersection
				// only an optional prop narrows to a new node
				if (intersection !== null) {
					newOptionalProps[i - required.length] = intersection as OptionalNode
					updated = true
				}
			}
		}

		if (updated) {
			return $.node(
				"structure",
				{ ...inner, optional: newOptionalProps },
				{ prereduced: true }
			)
		}
	}
}
