import type { PartialRecord } from "@ark/util"
import type { BaseNode } from "../node.js"
import type { Morph } from "../roots/morph.js"
import type { BaseRoot } from "../roots/root.js"
import type { BaseScope } from "../scope.js"
import { Disjoint } from "./disjoint.js"
import type {
	IntersectionContext,
	RootKind,
	UnknownIntersectionResult
} from "./implement.js"
import { isNode } from "./utils.js"

const intersectionCache: PartialRecord<string, UnknownIntersectionResult> = {}

type InternalNodeIntersection<ctx> = <l extends BaseNode, r extends BaseNode>(
	l: l,
	r: r,
	ctx: ctx
) => l["kind"] | r["kind"] extends RootKind ? BaseRoot | Disjoint
:	BaseNode | Disjoint | null

export const intersectNodesRoot: InternalNodeIntersection<BaseScope> = (
	l,
	r,
	$
) =>
	intersectNodes(l, r, {
		$,
		invert: false,
		pipe: false
	})

export const pipeNodesRoot: InternalNodeIntersection<BaseScope> = (l, r, $) =>
	intersectNodes(l, r, {
		$,
		invert: false,
		pipe: true
	})

export const intersectNodes: InternalNodeIntersection<IntersectionContext> = (
	l,
	r,
	ctx
) => {
	const operator = ctx.pipe ? "|>" : "&"
	const lrCacheKey = `${l.typeHash}${operator}${r.typeHash}`
	if (intersectionCache[lrCacheKey] !== undefined)
		return intersectionCache[lrCacheKey]! as never

	if (!ctx.pipe) {
		// we can only use this for the commutative & operator
		const rlCacheKey = `${r.typeHash}${operator}${l.typeHash}`
		if (intersectionCache[rlCacheKey] !== undefined) {
			// if the cached result was a Disjoint and the operands originally
			// appeared in the opposite order, we need to invert it to match
			const rlResult = intersectionCache[rlCacheKey]!
			const lrResult =
				rlResult instanceof Disjoint ? rlResult.invert() : rlResult
			// add the lr result to the cache directly to bypass this check in the future
			intersectionCache[lrCacheKey] = lrResult
			return lrResult as never
		}
	}
	if (l.equals(r as never)) return l as never

	let result

	if (ctx.pipe && l.kind !== "union" && r.kind !== "union") {
		if (l.includesMorph) {
			if (l.hasKind("morph")) {
				result =
					ctx.invert ?
						pipeToMorph(r as never, l, ctx)
					:	pipeFromMorph(l, r as never, ctx)
			} else {
				result = ctx.$.node("morph", {
					morphs: [r],
					in: l
				})
			}
		} else if (r.includesMorph) {
			if (!r.hasKind("morph")) {
				result = ctx.$.node("morph", {
					morphs: [r],
					in: l
				})
			} else {
				result =
					ctx.invert ?
						pipeFromMorph(r, l as never, ctx)
					:	pipeToMorph(l as never, r, ctx)
			}
		}
	}

	if (!result) {
		const leftmostKind = l.precedence < r.precedence ? l.kind : r.kind
		const implementation =
			l.impl.intersections[r.kind] ?? r.impl.intersections[l.kind]
		if (implementation === undefined) {
			// should be two ConstraintNodes that have no relation
			// this could also happen if a user directly intersects a Type and a ConstraintNode,
			// but that is not allowed by the external function signature
			result = null
		} else if (leftmostKind === l.kind) result = implementation(l, r, ctx)
		else {
			result = implementation(r, l, { ...ctx, invert: !ctx.invert })
			if (result instanceof Disjoint) result = result.invert()
		}
	}

	if (isNode(result)) {
		// if the result equals one of the operands, preserve its metadata by
		// returning the original reference
		if (l.equals(result)) result = l as never
		else if (r.equals(result)) result = r as never
	}

	intersectionCache[lrCacheKey] = result
	return result as never
}

export const pipeFromMorph = (
	from: Morph.Node,
	to: BaseRoot,
	ctx: IntersectionContext
): Morph.Node | Disjoint => {
	const morphs = [...from.morphs]
	if (from.validatedOut) {
		// still piped from context, so allows appending additional morphs
		const outIntersection = intersectNodes(from.validatedOut, to, ctx)
		if (outIntersection instanceof Disjoint) return outIntersection
		morphs[morphs.length - 1] = outIntersection
	} else morphs.push(to)

	return ctx.$.node("morph", {
		morphs,
		in: from.in
	})
}

export const pipeToMorph = (
	from: BaseRoot,
	to: Morph.Node,
	ctx: IntersectionContext
): Morph.Node | Disjoint => {
	const result = intersectNodes(from, to.in, ctx)
	if (result instanceof Disjoint) return result
	return ctx.$.node("morph", {
		morphs: to.morphs,
		// TODO: https://github.com/arktypeio/arktype/issues/1067
		in: result as Morph.ChildNode
	})
}
