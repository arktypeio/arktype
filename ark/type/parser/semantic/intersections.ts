import type { MorphAst, Out } from "@arktype/schema"
import {
	Hkt,
	type List,
	type conform,
	type evaluate,
	type intersectArrays,
	type isAny
} from "@arktype/util"

export type inferIntersection<l, r> = [l] extends [never]
	? never
	: [r] extends [never]
	  ? never
	  : [l & r] extends [never]
	    ? never
	    : isAny<l | r> extends true
	      ? any
	      : l extends MorphAst<infer lIn, infer lOut>
	        ? r extends MorphAst
						? never
						: (In: evaluate<lIn & r>) => Out<lOut>
	        : r extends MorphAst<infer rIn, infer rOut>
	          ? (In: evaluate<rIn & l>) => Out<rOut>
	          : [l, r] extends [object, object]
	            ? intersectObjects<l, r> extends infer result
								? result
								: never
	            : l & r

declare class MorphableIntersection extends Hkt.Kind {
	f: (
		In: conform<this[Hkt.key], [l: unknown, r: unknown]>
	) => inferIntersection<(typeof In)[0], (typeof In)[1]>
}

type intersectObjects<l, r> = [l, r] extends [
	infer lList extends List,
	infer rList extends List
]
	? intersectArrays<lList, rList, MorphableIntersection>
	: evaluate<
			{
				[k in keyof l]: k extends keyof r ? inferIntersection<l[k], r[k]> : l[k]
			} & Omit<r, keyof l>
	  >
