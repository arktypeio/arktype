import type { evaluate, isAny, List } from "@arktype/util"
import type { MorphAst, Out } from "../tuple.js"

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
	: intersectObjects<l, r> extends infer result
	? result
	: never

type intersectObjects<l, r> = [l, r] extends [object, object]
	? [l, r] extends [infer lList extends List, infer rList extends List]
		? inferArrayIntersection<lList, rList>
		: evaluate<{
				[k in keyof l | keyof r]: k extends keyof l
					? k extends keyof r
						? inferIntersection<l[k], r[k]>
						: l[k]
					: r[k & keyof r]
		  }>
	: l & r

// TODO: Test instantiations removing this in favor of HKT
type inferArrayIntersection<
	l extends List,
	r extends List,
	result extends List = []
> = [l, r] extends [
	[infer lHead, ...infer lTail],
	[infer rHead, ...infer rTail]
]
	? inferArrayIntersection<
			lTail,
			rTail,
			[...result, inferIntersection<lHead, rHead>]
	  >
	: l extends [infer lHead, ...infer lTail]
	? r extends []
		? // l is longer tuple than r, unsatisfiable
		  never
		: inferArrayIntersection<
				lTail,
				r,
				[...result, inferIntersection<lHead, r[number]>]
		  >
	: r extends [infer rHead, ...infer rTail]
	? l extends []
		? // r is longer tuple than l, unsatisfiable
		  never
		: inferArrayIntersection<
				l,
				rTail,
				[...result, inferIntersection<l[number], rHead>]
		  >
	: [number, number] extends [l["length"], r["length"]]
	? [...result, ...inferIntersection<l[number], r[number]>[]]
	: result
