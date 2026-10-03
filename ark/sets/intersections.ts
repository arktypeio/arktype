import {
	Disjoint,
	isNode,
	isResolutionFinal,
	rootKinds,
	type BaseNode,
	type BaseScope,
	type InternalNodeIntersection,
	type IntersectionContext,
	type Morph,
	type RootKind,
	type Union,
	type UnknownIntersectionResult,
	type mutableNormalizedRootOfKind,
	type nodeOfKind
} from "@ark/schema"
import type { TypeGuard } from "@ark/util"
import { setImplementationsByKind } from "./kinds.ts"

type IntersectionCache = Record<
	"&" | "|>",
	WeakMap<BaseNode, WeakMap<BaseNode, UnknownIntersectionResult>>
>

const createIntersectionCache = (): IntersectionCache => ({
	"&": new WeakMap(),
	"|>": new WeakMap()
})

// keyed by identity, so one scope's operands never get another scope's result
const intersectionCache = createIntersectionCache()
let pendingIntersectionCache: IntersectionCache | undefined

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
		let cache = intersectionCache
		if (l.includesAlias || r.includesAlias) {
			// relations between aliases are unknown until they're final, so a result reached before is reused only until then
			if (isResolutionFinal()) pendingIntersectionCache = undefined
			else cache = pendingIntersectionCache ??= createIntersectionCache()
		}
		const cacheByL = cache[ctx.pipe ? "|>" : "&"]
		let cacheByR = cacheByL.get(l)
		const cached = cacheByR?.get(r)
		if (cached !== undefined) return cached as never

		const isPureIntersection =
			!ctx.pipe || (!l.includesTransform && !r.includesTransform)

		if (isPureIntersection && l.equals(r)) return l

		let result =
			isPureIntersection ? _intersectNodes(l, r, ctx)
			: l.hasKindIn(...rootKinds) ?
				// if l is a RootNode, r will be as well
				_pipeNodes(l, r as never, ctx)
			:	_intersectNodes(l, r, ctx)

		if (isNode(result)) {
			// if the result equals one of the operands, preserve its metadata by
			// returning the original reference
			if (l.equals(result)) result = l
			else if (r.equals(result)) result = r
		}

		if (!cacheByR) cacheByL.set(l, (cacheByR = new WeakMap()))
		cacheByR.set(r, result)
		return result as never
	}) as never

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
	l.includesTransform || r.includesTransform ?
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

			if (viableBranches.length === 0)
				return Disjoint.init("union", from.branches, to.branches)

			// if the input type has changed, create a new node without preserving metadata
			if (
				viableBranches.length < from.branches.length ||
				!from.branches.every((branch, i) =>
					branch.rawIn.equals(viableBranches[i].rawIn)
				)
			)
				return ctx.$.parseSchema(viableBranches)

			// otherwise, the input has not changed so preserve metadata

			let meta: ArkEnv.meta | undefined

			if (viableBranches.length === 1) {
				const onlyBranch = viableBranches[0]
				if (!meta) return onlyBranch
				return ctx.$.node("morph", {
					...onlyBranch.inner,
					in: onlyBranch.rawIn.configure(meta, "self")
				})
			}

			const schema: mutableNormalizedRootOfKind<"union"> = {
				branches: viableBranches
			}

			if (meta) schema.meta = meta

			return ctx.$.parseSchema(schema)
		}
	)

const _pipeMorphed = (
	from: Union.ChildNode,
	to: nodeOfKind<RootKind>,
	ctx: IntersectionContext
): Morph.Node | Disjoint => {
	const fromIsMorph = from.hasKind("morph")

	if (fromIsMorph) {
		const morphs = [...from.morphs]
		if (from.lastMorphIfNode) {
			// still piped from context, so allows appending additional morphs
			const outIntersection = intersectOrPipeNodes(
				from.lastMorphIfNode,
				to,
				ctx
			)
			if (outIntersection instanceof Disjoint) return outIntersection
			morphs[morphs.length - 1] = outIntersection
		} else morphs.push(to)

		return ctx.$.node("morph", {
			morphs,
			in: from.inner.in as any
		})
	}

	if (to.hasKind("morph")) {
		const inTersection = intersectOrPipeNodes(from, to.rawIn, ctx)
		if (inTersection instanceof Disjoint) return inTersection

		return ctx.$.node("morph", {
			morphs: [to],
			in: inTersection
		})
	}

	return ctx.$.node("morph", {
		morphs: [to],
		in: from
	})
}
