import {
	Hkt,
	type List,
	type conform,
	type evaluate,
	type intersectArrays,
	type isAny,
	type listable
} from "@arktype/util"
import type { Node } from "../base.js"
import type { MorphAst, Out } from "../types/morph.js"
import type { intersectTypeKinds } from "../types/type.js"
import type { Disjoint } from "./disjoint.js"
import type { ConstraintKind, NodeKind, TypeKind } from "./implement.js"

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

export type nodeIntersectionOperandKind<kind extends NodeKind> =
	kind extends ConstraintKind ? ConstraintKind : TypeKind

export type nodeIntersectionOperand<kind extends NodeKind> = Node<
	nodeIntersectionOperandKind<kind>
>

export type nodeIntersectionResultKind<
	lKind extends NodeKind,
	rKind extends NodeKind
> = lKind extends TypeKind
	? rKind extends TypeKind
		? intersectTypeKinds<lKind, rKind>
		: lKind | rKind
	: lKind | rKind

export type baseNodeIntersectionResult<
	lKind extends NodeKind,
	rKind extends NodeKind,
	lType,
	rType
> = Node<
	nodeIntersectionResultKind<lKind, rKind>,
	inferIntersection<lType, rType>
>

export type nodeIntersectionResult<
	lKind extends NodeKind,
	rKind extends NodeKind,
	lType,
	rType
> =
	| baseNodeIntersectionResult<lKind, rKind, lType, rType>
	| Disjoint
	| (lKind extends ConstraintKind
			? null | List<baseNodeIntersectionResult<lKind, rKind, lType, rType>>
			: never)

export type UnknownNodeIntersectionResult = listable<Node> | Disjoint | null
