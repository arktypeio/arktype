import {
	Hkt,
	type array,
	type conform,
	type intersectArrays,
	type isAny,
	type PartialRecord,
	type show
} from "@arktype/util"
import type { of } from "../constraints/ast.js"
import type { RawConstraint } from "../constraints/constraint.js"
import type { RawNode } from "../node.js"
import type { RawSchema } from "../schema.js"
import type { MorphAst, Out } from "../schemas/morph.js"
import { Disjoint } from "./disjoint.js"
import type {
	IntersectionContext,
	SchemaKind,
	UnknownIntersectionResult
} from "./implement.js"
import { isNode } from "./utils.js"

export type inferIntersection<l, r> = $inferIntersection<l, r, false>

export type inferPipe<l, r> = $inferIntersection<l, r, true>

type $inferIntersection<l, r, piped extends boolean> =
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
		: (In: $inferIntersection<lIn, r, false>) => Out<lOut>
	: r extends MorphAst<infer rIn, infer rOut> ?
		(In: $inferIntersection<rIn, l, false>) => Out<rOut>
	: l extends of<infer lBase, infer lConstraints> ?
		r extends of<infer rBase, infer rConstraints> ?
			of<$inferIntersection<lBase, rBase, piped>, lConstraints & rConstraints>
		:	of<$inferIntersection<lBase, r, piped>, lConstraints>
	: r extends of<infer rBase, infer rConstraints> ?
		of<$inferIntersection<l, rBase, piped>, rConstraints>
	: [l, r] extends [object, object] ?
		// adding this intermediate infer result avoids extra instantiations
		intersectObjects<l, r, piped> extends infer result ?
			result
		:	never
	:	l & r

declare class MorphableIntersection<piped extends boolean> extends Hkt.Kind {
	hkt: (
		In: conform<this[Hkt.args], [l: unknown, r: unknown]>
	) => $inferIntersection<(typeof In)[0], (typeof In)[1], piped>
}

type intersectObjects<l, r, piped extends boolean> =
	[l, r] extends [infer lList extends array, infer rList extends array] ?
		intersectArrays<lList, rList, MorphableIntersection<piped>>
	:	show<
			{
				[k in keyof l]: k extends keyof r ?
					$inferIntersection<l[k], r[k], piped>
				:	l[k]
			} & Omit<r, keyof l>
		>

const intersectionCache: PartialRecord<string, UnknownIntersectionResult> = {}

export const intersectNodes = <l extends RawNode, r extends RawNode>(
	l: l,
	r: r,
	ctx: IntersectionContext
): l["kind"] | r["kind"] extends SchemaKind ? RawSchema | Disjoint
:	RawConstraint | Disjoint | null => {
	const operator = ctx.piped ? "|>" : "&"
	const lrCacheKey = `${l.typeId}${operator}${r.typeId}`
	if (intersectionCache[lrCacheKey]) {
		return intersectionCache[lrCacheKey]! as never
	}
	const rlCacheKey = `${r.typeId}${operator}${l.typeId}`
	if (intersectionCache[rlCacheKey]) {
		// if the cached result was a Disjoint and the operands originally
		// appeared in the opposite order, we need to invert it to match
		const rlResult = intersectionCache[rlCacheKey]!
		const lrResult = rlResult instanceof Disjoint ? rlResult.invert() : rlResult
		// add the lr result to the cache directly to bypass this check in the future
		intersectionCache[lrCacheKey] = lrResult
		return lrResult as never
	}

	if (l.equals(r as never)) {
		return l as never
	}

	const leftmostKind = l.precedence < r.precedence ? l.kind : r.kind
	const implementation =
		l.impl.intersections[r.kind] ?? r.impl.intersections[l.kind]

	let result =
		implementation === undefined ?
			// should be two ConstraintNodes that have no relation
			// this could also happen if a user directly intersects a Type and a ConstraintNode,
			// but that is not allowed by the external function signature
			null
		: leftmostKind === l.kind ? implementation(l, r, ctx)
		: implementation(r, l, ctx)

	if (isNode(result)) {
		// if the result equals one of the operands, preserve its metadata by
		// returning the original reference
		if (l.equals(result)) result = l as never
		else if (r.equals(result)) result = r as never
	}

	intersectionCache[lrCacheKey] = result
	return result as never
}
