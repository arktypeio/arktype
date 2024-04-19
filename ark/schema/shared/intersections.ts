import {
	Hkt,
	type array,
	type conform,
	type intersectArrays,
	type isAny,
	type show
} from "@arktype/util"
import type { of } from "../constraints/ast.js"
import type { MorphAst, Out } from "../schemas/morph.js"

export type inferIntersection<l, r, piped extends boolean = false> =
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
		: (In: inferIntersection<lIn, r>) => Out<lOut>
	: r extends MorphAst<infer rIn, infer rOut> ?
		(In: inferIntersection<rIn, l>) => Out<rOut>
	: l extends of<infer lBase, infer lConstraints> ?
		r extends of<infer rBase, infer rConstraints> ?
			of<inferIntersection<lBase, rBase>, lConstraints & rConstraints>
		:	of<inferIntersection<lBase, r>, lConstraints>
	: r extends of<infer rBase, infer rConstraints> ?
		of<inferIntersection<l, rBase>, rConstraints>
	: [l, r] extends [object, object] ?
		intersectObjects<l, r, piped> extends infer result ?
			result
		:	never
	:	l & r

declare class MorphableIntersection<piped extends boolean> extends Hkt.Kind {
	hkt: (
		In: conform<this[Hkt.args], [l: unknown, r: unknown]>
	) => inferIntersection<(typeof In)[0], (typeof In)[1], piped>
}

type intersectObjects<l, r, piped extends boolean> =
	[l, r] extends [infer lList extends array, infer rList extends array] ?
		intersectArrays<lList, rList, MorphableIntersection<piped>>
	:	show<
			{
				[k in keyof l]: k extends keyof r ? inferIntersection<l[k], r[k]> : l[k]
			} & Omit<r, keyof l>
		>
