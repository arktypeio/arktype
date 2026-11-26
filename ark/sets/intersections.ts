import {
	$ark,
	Disjoint,
	isIoFinal,
	isNode,
	isResolutionFinal,
	rootKinds,
	type BaseNode,
	type BaseRoot,
	type BaseScope,
	type InternalNodeIntersection,
	type IntersectionContext,
	type Morph,
	type RootKind,
	type Structure,
	type Union,
	type UnknownIntersectionResult,
	type nodeOfKind
} from "@ark/schema"
import type { TypeGuard } from "@ark/util"
import { setImplementationsByKind } from "./kinds.ts"
import { isDeferredUnitIntersection } from "./roots/unit.ts"

type IntersectionCache = WeakMap<
	BaseScope,
	Record<
		"&" | "|>",
		WeakMap<BaseNode, WeakMap<BaseNode, UnknownIntersectionResult>>
	>
>

// a result belongs to the scope that parsed it
const intersectionCache: IntersectionCache = new WeakMap()

export const intersectNodesRoot: InternalNodeIntersection<BaseScope> = (
	l,
	r,
	$
) =>
	intersectOrPipeNodes(l, r, {
		$,
		invert: false,
		pipe: false
	})

export const pipeNodesRoot: InternalNodeIntersection<BaseScope> = (l, r, $) =>
	intersectOrPipeNodes(l, r, {
		$,
		invert: false,
		pipe: true
	})

export const intersectOrPipeNodes: InternalNodeIntersection<IntersectionContext> =
	((
		l: BaseNode,
		r: BaseNode,
		ctx: IntersectionContext
	): BaseNode | Disjoint | null => {
		let cacheByOperator = intersectionCache.get(ctx.$)
		if (!cacheByOperator) {
			intersectionCache.set(
				ctx.$,
				(cacheByOperator = { "&": new WeakMap(), "|>": new WeakMap() })
			)
		}
		const cacheByL = cacheByOperator[ctx.pipe ? "|>" : "&"]
		let cacheByR = cacheByL.get(l)
		const cached = cacheByR?.get(r)
		// a unit's intersection deferred while an alias could be unresolved stands
		// for neither operand, so once they've resolved it's decided instead
		if (
			cached !== undefined &&
			!(
				isNode(cached) &&
				isDeferredUnitIntersection(cached) &&
				isResolutionFinal()
			)
		) {
			$ark.reached?.cached(cacheByR!, r)
			return cached as never
		}
		const mark = $ark.reached?.mark()

		const isPureIntersection = !ctx.pipe || (!l.alters && !r.alters)

		if (isPureIntersection && l.equals(r)) return l

		let result =
			isPureIntersection ?
				(disjointInputsOf(l, r, ctx) ?? _intersectNodes(l, r, ctx))
			: l.hasKindIn(...rootKinds) ?
				// if l is a RootNode, r will be as well
				_pipeNodes(l, r as never, ctx)
			:	_intersectNodes(l, r, ctx)

		if (isNode(result)) {
			// if the result equals one of the operands, preserve its metadata by
			// returning the original reference
			result =
				$ark.sets!.disjointOf?.(result) ??
				(l.equals(result) && listsKeysAlike(l, result) ? l
				: r.equals(result) && listsKeysAlike(r, result) ? r
				: result)
		}

		if (!cacheByR) cacheByL.set(l, (cacheByR = new WeakMap()))
		cacheByR.set(r, result)
		$ark.reached?.store(mark, cacheByR, r)
		return result as never
	}) as never

// no data reaches both of two Types whose inputs are disjoint, so they are
// disjoint whatever morphs they hold. Morphs must be the same only for data
// reaching both, but are compared wherever two meet, which can be at a key
// intersected before the one the inputs are disjoint at
const disjointInputsOf = (
	l: BaseNode,
	r: BaseNode,
	ctx: IntersectionContext
): Disjoint | undefined => {
	if (!l.hasMorph || !r.hasMorph || !l.isRoot() || !r.isRoot()) return
	const lIn = l._in
	const rIn = r._in
	if (lIn === l && rIn === r) return
	const inputs = intersectOrPipeNodes(lIn, rIn, ctx)
	if (inputs instanceof Disjoint) return inputs
}

// equal nodes can list their outputs' keys in different orders
export const listsKeysAlike = (l: BaseNode, r: BaseNode): boolean =>
	l === r ||
	(l.children.length === r.children.length &&
		!(l as Structure.Node).inOrder?.some(
			(prop, i) => prop.key !== (r as Structure.Node).inOrder[i].key
		) &&
		l.children.every((child, i) => listsKeysAlike(child, r.children[i])))

const _intersectNodes = (
	l: BaseNode,
	r: BaseNode,
	ctx: IntersectionContext
) => {
	const leftmostKind = l.precedence < r.precedence ? l.kind : r.kind
	const implementation =
		setImplementationsByKind[l.kind].intersections[r.kind] ??
		setImplementationsByKind[r.kind].intersections[l.kind]
	if (implementation === undefined) {
		// should be two ConstraintNodes that have no relation
		// this could also happen if a user directly intersects a Type and a ConstraintNode,
		// but that is not allowed by the external function signature
		return null
	} else if (leftmostKind === l.kind) return implementation(l, r, ctx)
	else {
		let result = implementation(r, l, { ...ctx, invert: !ctx.invert })
		if (result instanceof Disjoint) result = result.invert()
		return result
	}
}

const _pipeNodes = (
	l: nodeOfKind<RootKind>,
	r: nodeOfKind<RootKind>,
	ctx: IntersectionContext
) =>
	l.alters || r.alters ?
		ctx.invert ?
			pipeMorphed(r, l, ctx)
		:	pipeMorphed(l, r, ctx)
	:	_intersectNodes(l, r, ctx)

const pipeMorphed = (
	from: nodeOfKind<RootKind>,
	to: nodeOfKind<RootKind>,
	ctx: IntersectionContext
) =>
	from.distribute(
		fromBranch => _pipeMorphed(fromBranch, to, ctx),
		results => {
			const viableBranches = results.filter(
				isNode as TypeGuard<unknown, Morph.Node>
			)

			return viableBranches.length === 0 ?
					Disjoint.init("union", from.branches, to.branches)
				:	ctx.$.node("union", { branches: viableBranches })
		}
	)

const _pipeMorphed = (
	from: Union.ChildNode,
	to: nodeOfKind<RootKind>,
	ctx: IntersectionContext
): Morph.Node | Disjoint => {
	const fromIsMorph = from.is("morph")

	if (fromIsMorph) {
		const morphs = [...from.morphs]
		if (from.tail) {
			// still piped from context, so allows appending additional morphs
			const outIntersection = intersectOrPipeNodes(from.tail, to, ctx)
			if (outIntersection instanceof Disjoint) return outIntersection
			morphs[morphs.length - 1] = outIntersection
		} else morphs.push(to)

		// a basisless constraint (e.g. from .narrow or .constrainOut) narrows
		// declaredOut rather than replacing it; a full target becomes the tail
		// whose own output is ._out
		let declaredOut: BaseRoot | undefined
		if (
			from.inner.declaredOut &&
			to.is("intersection") &&
			!to.basis &&
			!to.isUnknown() &&
			(isIoFinal() || (!from.inner.declaredOut.hasAlias && !to.hasAlias))
		) {
			const outTersection = intersectOrPipeNodes(
				from.inner.declaredOut,
				to,
				ctx
			)
			if (outTersection instanceof Disjoint) return outTersection
			declaredOut = outTersection._out
		}

		return ctx.$.node("morph", {
			morphs,
			...(from.inner.declaredIn && { declaredIn: from.inner.declaredIn }),
			...(declaredOut && { declaredOut }),
			inverse: from.inner.inverse as any
		})
	}

	if (to.is("morph")) {
		const inTersection = intersectOrPipeNodes(from, to._in, ctx)
		if (inTersection instanceof Disjoint) return inTersection

		return ctx.$.node("morph", { morphs: [inTersection, to] })
	}

	// a branch that alters nothing, piped to what alters nothing and doesn't
	// intersect it, is dropped as `null |> string` throws outside a union. One
	// that does intersect stays a morph, so configuring the pipe leaves its
	// output's description and JSON Schema its own
	if (!from.alters && !to.alters) {
		const intersection = intersectOrPipeNodes(from, to, ctx)
		if (intersection instanceof Disjoint) return intersection
	}

	return ctx.$.node("morph", { morphs: [from, to] })
}
