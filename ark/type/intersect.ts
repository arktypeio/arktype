import type {
	anyOrNever,
	array,
	conform,
	Hkt,
	intersectArrays,
	show
} from "@ark/util"
import type { Constraints, MorphAst, of, Out, parseConstraints } from "./ast.js"

export type inferIntersection<l, r> = _inferIntersection<l, r, false>

export type inferPipe<l, r> = _inferIntersection<l, r, true>

type _inferIntersection<l, r, piped extends boolean> =
	[l & r] extends [infer t extends anyOrNever] ? t
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
	: parseConstraints<l> extends (
		[infer lBase, infer lConstraints extends Constraints]
	) ?
		parseConstraints<r> extends (
			[infer rBase, infer rConstraints extends Constraints]
		) ?
			of<_inferIntersection<lBase, rBase, piped>, lConstraints & rConstraints>
		:	of<_inferIntersection<lBase, r, piped>, lConstraints>
	: parseConstraints<r> extends (
		[infer rBase, infer rConstraints extends Constraints]
	) ?
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
