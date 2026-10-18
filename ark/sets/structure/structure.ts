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

// "reject" checks string keys only, so it allows any symbol key
const allowedKeysOf = (node: Structure.Node): BaseRoot =>
	node.undeclared === "reject" ?
		node.keyof().rawOr($ark.intrinsic.symbol.internal)
	:	node.keyof()

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
			if (l.undeclared) {
				const lKey = allowedKeysOf(l)
				for (const k of r.requiredKeys) {
					if (!lKey.allows(k)) {
						disjointResult.add(
							"presence",
							$ark.intrinsic.never.internal,
							r.propsByKey[k]!.value,
							{
								path: [k]
							}
						)
					}
				}

				if (rInner.optional)
					rInner.optional = rInner.optional.filter(n => lKey.allows(n.key))
				if (rInner.index) {
					rInner.index = rInner.index.flatMap(n => {
						if (n.signature.extends(lKey)) return n
						const indexOverlap = intersectNodesRoot(lKey, n.signature, ctx.$)
						if (indexOverlap instanceof Disjoint) return []
						const normalized = normalizeIndex(indexOverlap, n.value, ctx.$)
						// an index's value, which a loose scope doesn't widen
						for (const prop of normalized.required ?? []) {
							rDerived.push(
								ctx.$.node("optional", prop.inner, { prereduced: true })
							)
						}
						rDerived.push(...(normalized.optional ?? []))
						return normalized.index ?? []
					})
				}
			}
			if (r.undeclared) {
				const rKey = allowedKeysOf(r)
				for (const k of l.requiredKeys) {
					if (!rKey.allows(k)) {
						disjointResult.add(
							"presence",
							l.propsByKey[k]!.value,
							$ark.intrinsic.never.internal,
							{
								path: [k]
							}
						)
					}
				}

				if (lInner.optional)
					lInner.optional = lInner.optional.filter(n => rKey.allows(n.key))
				if (lInner.index) {
					lInner.index = lInner.index.flatMap(n => {
						if (n.signature.extends(rKey)) return n
						const indexOverlap = intersectNodesRoot(rKey, n.signature, ctx.$)
						if (indexOverlap instanceof Disjoint) return []
						const normalized = normalizeIndex(indexOverlap, n.value, ctx.$)
						// an index's value, which a loose scope doesn't widen
						for (const prop of normalized.required ?? []) {
							lDerived.push(
								ctx.$.node("optional", prop.inner, { prereduced: true })
							)
						}
						lDerived.push(...(normalized.optional ?? []))

						return normalized.index ?? []
					})
				}
			}

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

		// check required keys for duplicates and handle index intersections
		if (inner.required) {
			for (let i = 0; i < inner.required.length; i++) {
				const requiredProp = inner.required[i]
				if (seen.has(requiredProp.key))
					throwParseError(writeDuplicateKeyMessage(requiredProp.key))
				seen.add(requiredProp.key)

				if (inner.index) {
					for (const index of inner.index) {
						const intersection = intersectPropsAndIndex(requiredProp, index, $)
						if (intersection instanceof Disjoint) return intersection
					}
				}
			}
		}

		// check optional keys for duplicates and handle index intersections
		if (inner.optional) {
			for (let i = 0; i < inner.optional.length; i++) {
				const optionalProp = inner.optional[i]
				if (seen.has(optionalProp.key))
					throwParseError(writeDuplicateKeyMessage(optionalProp.key))
				seen.add(optionalProp.key)

				if (inner.index) {
					for (const index of inner.index) {
						const intersection = intersectPropsAndIndex(optionalProp, index, $)
						if (intersection instanceof Disjoint) return intersection
						if (intersection !== null) {
							newOptionalProps[i] = intersection
							updated = true
						}
					}
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
