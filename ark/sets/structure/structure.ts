import {
	$ark,
	Disjoint,
	normalizeIndex,
	writeDuplicateKeyMessage,
	type BaseScope,
	type OptionalNode,
	type Structure,
	type nodeOfKind
} from "@ark/schema"
import { throwParseError, type Key } from "@ark/util"
import { flattenConstraints, intersectConstraints } from "../constraint.ts"
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

	if (!r.signature.allows(l.key)) return null

	const value = intersectNodesRoot(l.value, r.value, $)
	if (value instanceof Disjoint) {
		return kind === "optional" ?
				($.node("optional", {
					key: l.key,
					value: $ark.intrinsic.never.internal
				}) as l)
				// optional, since an index signature doesn't require the key
			:	value.withPrefixKey(l.key, "optional")
	}

	return null
}

export const structure: setImplementationOf<Structure.Declaration> = {
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
				const lKey = l.keyof()
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
						for (const prop of normalized.required ?? [])
							rDerived.push(ctx.$.node("optional", prop.inner))
						rDerived.push(...(normalized.optional ?? []))
						return normalized.index ?? []
					})
				}
			}
			if (r.undeclared) {
				const rKey = r.keyof()
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
						for (const prop of normalized.required ?? [])
							lDerived.push(ctx.$.node("optional", prop.inner))
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

			// a transform applies each prop and index signature to the key in turn
			if (
				!l.includesTransform &&
				!r.includesTransform &&
				((l.index && r.props.length) || (r.index && l.props.length))
			) {
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

		const seen: Record<Key, true | undefined> = Object.create(null)
		let updated = false
		const newOptionalProps: OptionalNode[] =
			inner.optional ? [...inner.optional] : []

		// check required keys for duplicates and handle index intersections
		if (inner.required) {
			for (let i = 0; i < inner.required.length; i++) {
				const requiredProp = inner.required[i]
				if (requiredProp.key in seen)
					throwParseError(writeDuplicateKeyMessage(requiredProp.key))
				seen[requiredProp.key] = true

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
				if (optionalProp.key in seen)
					throwParseError(writeDuplicateKeyMessage(optionalProp.key))
				seen[optionalProp.key] = true

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
