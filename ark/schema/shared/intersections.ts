import {
	Hkt,
	type array,
	type conform,
	type intersectArrays,
	type isAny,
	type PartialRecord,
	type show
} from "@arktype/util"
import type { of } from "../ast.js"
import type { BaseNode } from "../node.js"
import type { MorphAst, MorphNode, Out } from "../roots/morph.js"
import type { BaseRoot } from "../roots/root.js"
import type { RawRootScope } from "../scope.js"
import { Disjoints } from "./disjoint.js"
import type {
	IntersectionContext,
	RootKind,
	UnknownIntersectionResult
} from "./implement.js"
import { isNode } from "./utils.js"

export type inferIntersection<l, r> = _inferIntersection<l, r, false>

export type inferPipe<l, r> = _inferIntersection<l, r, true>

type _inferIntersection<l, r, piped extends boolean> =
	[l] extends [never] ? never
	: [r] extends [never] ? never
	: [l & r] extends [never] ? never
	: isAny<l | r> extends true ? any
	: l extends MorphAst<infer lIn, infer lOut> ?
		r extends MorphAst<any, infer rOut> ?
			piped extends true ?
				(In: lIn) => Out<rOut>
			:	// a commutative intersection between two morphs is a ParseError
				never
		: piped extends true ? (In: lIn) => Out<r>
		: (In: _inferIntersection<lIn, r, false>) => Out<lOut>
	: r extends MorphAst<infer rIn, infer rOut> ?
		(In: _inferIntersection<rIn, l, false>) => Out<rOut>
	: l extends of<infer lBase, infer lConstraints> ?
		r extends of<infer rBase, infer rConstraints> ?
			of<_inferIntersection<lBase, rBase, piped>, lConstraints & rConstraints>
		:	of<_inferIntersection<lBase, r, piped>, lConstraints>
	: r extends of<infer rBase, infer rConstraints> ?
		of<_inferIntersection<l, rBase, piped>, rConstraints>
	: [l, r] extends [object, object] ?
		// adding this intermediate infer result avoids extra instantiations
		intersectObjects<l, r, piped> extends infer result ?
			result
		:	never
	:	l & r

declare class MorphableIntersection<piped extends boolean> extends Hkt.Kind {
	hkt: (
		In: conform<this[Hkt.args], [l: unknown, r: unknown]>
	) => _inferIntersection<(typeof In)[0], (typeof In)[1], piped>
}

type intersectObjects<l, r, piped extends boolean> =
	[l, r] extends [infer lList extends array, infer rList extends array] ?
		intersectArrays<lList, rList, MorphableIntersection<piped>>
	:	show<
			// this looks redundant, but should hit the cache anyways and
			// preserves index signature + optional keys correctly
			{
				[k in keyof l]: k extends keyof r ?
					_inferIntersection<l[k], r[k], piped>
				:	l[k]
			} & {
				[k in keyof r]: k extends keyof l ?
					_inferIntersection<l[k], r[k], piped>
				:	r[k]
			}
		>

const intersectionCache: PartialRecord<string, UnknownIntersectionResult> = {}

type InternalNodeIntersection<ctx> = <l extends BaseNode, r extends BaseNode>(
	l: l,
	r: r,
	ctx: ctx
) => l["kind"] | r["kind"] extends RootKind ? BaseRoot | Disjoints
:	BaseNode | Disjoints | null

export const intersectNodesRoot: InternalNodeIntersection<RawRootScope> = (
	l,
	r,
	$
) => intersectNodes(l, r, { $, invert: false, pipe: false })

export const pipeNodesRoot: InternalNodeIntersection<RawRootScope> = (
	l,
	r,
	$
) => intersectNodes(l, r, { $, invert: false, pipe: true })

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
				rlResult instanceof Disjoints ? rlResult.invert() : rlResult
			// add the lr result to the cache directly to bypass this check in the future
			intersectionCache[lrCacheKey] = lrResult
			return lrResult as never
		}
	}
	if (l.equals(r as never)) return l as never

	let result: UnknownIntersectionResult

	if (ctx.pipe && l.hasKind("morph")) {
		result =
			ctx.invert ?
				pipeToMorph(r as never, l, ctx)
			:	pipeFromMorph(l, r as never, ctx)
	} else if (ctx.pipe && r.hasKind("morph")) {
		result =
			ctx.invert ?
				pipeFromMorph(r, l as never, ctx)
			:	pipeToMorph(l as never, r, ctx)
	} else {
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
			if (result instanceof Disjoints) result = result.invert()
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

// TODO: double check pipes through chained morphs

export const pipeFromMorph = (
	from: MorphNode,
	to: BaseRoot,
	ctx: IntersectionContext
): MorphNode | Disjoints => {
	const morphs = [...from.morphs]
	if (from.validatedOut) {
		// still piped from context, so allows appending additional morphs
		const outIntersection = intersectNodes(from.validatedOut, to, ctx)
		if (outIntersection instanceof Disjoints) return outIntersection
		morphs[morphs.length - 1] = outIntersection
	} else morphs.push(to)

	return ctx.$.node("morph", {
		morphs,
		in: from.in
	})
}

export const pipeToMorph = (
	from: BaseRoot,
	to: MorphNode,
	ctx: IntersectionContext
): MorphNode | Disjoints => {
	const result = intersectNodes(from, to.in, ctx)
	if (result instanceof Disjoints) return result
	return ctx.$.node("morph", {
		morphs: to.morphs,
		in: result
	})
}
