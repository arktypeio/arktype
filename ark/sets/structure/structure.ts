import {
	$ark,
	Disjoint,
	inProgress,
	normalizeIndex,
	normalizeOrder,
	queueUnchecked,
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
	if (r.signature.allowsCtx || !r.signature.allowsUnused(l.key)) return null

	// a key's transforms apply in turn once each value allows its input
	const intersectValues = (lValue: BaseRoot, rValue: BaseRoot) =>
		lValue.alters && rValue.alters ?
			intersectNodesRoot(lValue._in, rValue._in, $)
		:	intersectNodesRoot(lValue, rValue, $)
	const value = intersectValues(l.value, r.value)
	// a cyclic value a definition's key meets is decided once definitions
	// close, where a required key's is unsatisfiable as if written out
	if (
		kind === "required" &&
		inProgress.definitions &&
		!(value instanceof Disjoint) &&
		value.is("alias")
	) {
		queueUnchecked(() => {
			const resolved = intersectValues(unaliased(l.value), unaliased(r.value))
			if (resolved instanceof Disjoint)
				resolved.withPrefixKey(l.key, "optional").throw()
		}, `${l.id}&${r.id}`)
	}
	if (value instanceof Disjoint) {
		// absent, since one of the disjoint values rejects undefined
		return kind === "optional" ?
				($.node(
					"optional",
					{ key: l.key, value: $ark.kw.never.internal },
					{ reduced: true }
				) as l)
				// optional, since an index signature doesn't require the key
			:	value.withPrefixKey(l.key, "optional")
	}

	return null
}

const unaliased = (node: BaseRoot): BaseRoot =>
	node.is("alias") ? node.resolution : node

// a number key names the same property as its string
const propertyOf = (key: Key): Key =>
	typeof key === "symbol" ? key : String(key)

// a sequence declares its indices, and "reject" checks string keys only, so
// it allows any symbol key
const allowedKeysOf = (node: Structure.Node): BaseRoot => {
	let keys = node.keyof()
	if (node.sequence)
		keys = keys.rawOr($ark.kw.nonNegativeIntegerString.internal)
	return node.undeclared === "reject" ?
			keys.rawOr($ark.kw.symbol.internal)
		:	keys
}

// a structure allowing more leading indices bounds an array here, narrower
// than it is, rather than counting on
const maxCountedIndices = 1024

// how many leading indices keys allow, or null if every index a sequence can
// have
const allowedIndexCountOf = (
	keys: BaseRoot,
	sequence: nodeOfKind<"sequence">
): number | null => {
	if ($ark.kw.nonNegativeIntegerString.internal.extends(keys)) return null
	const max = Math.min(
		sequence.maxLength ?? maxCountedIndices,
		maxCountedIndices
	)
	let count = 0
	while (count < max && keys.allowsUnused(`${count}`)) count++
	return count === sequence.maxLength ? null : count
}

// the element at an index below a sequence's minLength
const requiredElementAt = (
	sequence: nodeOfKind<"sequence">,
	i: number
): BaseRoot => {
	const variadicEnd = sequence.preLen + sequence.minVariadicLength
	return (
		i < sequence.preLen ? sequence.prefix![i]
		: i < variadicEnd ? sequence.variadic!
		: sequence.postfix![i - variadicEnd]
	)
}

// narrows other's optional props, index signatures and sequence to the keys a
// structure with undeclared keys allows, adding a disjoint for each required
// key or element it doesn't
const narrowToKeysOf = (
	node: Structure.Node,
	other: Structure.Node,
	otherInner: {
		optional?: readonly OptionalNode[]
		index?: readonly nodeOfKind<"index">[]
		sequence?: nodeOfKind<"sequence">
	},
	derived: OptionalNode[],
	roots: BaseRoot[],
	disjoint: Disjoint,
	$: BaseScope,
	isLeft: boolean
): void => {
	const keys = allowedKeysOf(node)
	const count =
		node.undeclared === "reject" && other.sequence ?
			allowedIndexCountOf(keys, other.sequence)
		:	null
	if (count !== null) {
		const sequence = other.sequence!
		if (sequence.minLength > count) {
			const value = requiredElementAt(sequence, count)
			const never = $ark.kw.never.internal
			disjoint.push(
				...Disjoint.init(
					"presence",
					isLeft ? never : value,
					isLeft ? value : never
				).withPrefixKey(count, "required")
			)
		}
		// as a length bound, 0 would be an exact length, which a union could
		// mistake for a discriminant of node, which needn't be an array
		else if (count === 0) {
			otherInner.sequence = $.node("sequence", {
				variadic: $ark.kw.never.internal
			})
		} else {
			roots.push(
				$.node("intersection", {
					proto: $.node("proto", { proto: Array }),
					// at least 1, so it doesn't reduce to an exact length
					maxLength: $.node("maxLength", { rule: count }) as never
				})
			)
		}
	}
	for (const k of other.requiredKeys) {
		if (keys.allowsUnused(k)) continue
		const value = other.byKey[k]!.value
		const never = $ark.kw.never.internal
		disjoint.add("presence", isLeft ? never : value, isLeft ? value : never, {
			path: [k],
			undeclared: node.handlesUndeclared
		})
	}
	if (otherInner.optional) {
		otherInner.optional = otherInner.optional.filter(n =>
			keys.allowsUnused(n.key)
		)
	}
	if (otherInner.index) {
		otherInner.index = otherInner.index.flatMap(n => {
			if (n.signature.extends(keys)) return n
			const overlap = intersectNodesRoot(keys, n.signature, $)
			if (overlap instanceof Disjoint) return []
			const normalized = normalizeIndex(overlap, n.value, $)
			// an index's value, which a loose scope doesn't widen
			for (const prop of normalized.required ?? [])
				derived.push($.node("optional", prop.inner, { reduced: true }))
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
		normalizeOrder(inner)
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
			// length bounds on an array a closed structure narrows
			const roots: BaseRoot[] = []
			if (l.handlesUndeclared) {
				narrowToKeysOf(
					l,
					r,
					rInner,
					rDerived,
					roots,
					disjointResult,
					ctx.$,
					true
				)
			}
			if (r.handlesUndeclared) {
				narrowToKeysOf(
					r,
					l,
					lInner,
					lDerived,
					roots,
					disjointResult,
					ctx.$,
					false
				)
			}

			// as a spread would, keys keep l's order and r's new keys follow
			const baseInner: Structure.Inner.mutable =
				l.props.length || r.props.length ?
					{ order: [...l.keyOrder, ...r.keyOrder] }
				:	{}

			if (l.undeclared || r.undeclared) {
				baseInner.undeclared =
					l.undeclared === "reject" || r.undeclared === "reject" ? "reject"
					: l.undeclared === "delete" || r.undeclared === "delete" ? "delete"
					: "ignore"
			}

			const childIntersectionResult = intersectConstraints({
				kind: "structure",
				baseInner,
				l: flattenConstraints(lInner),
				// l's derived props precede r's constraints to meet them as l operands
				r: [...lDerived, ...flattenConstraints(rInner), ...rDerived],
				roots,
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
				{ reduced: true }
			)
		}
	}
}
