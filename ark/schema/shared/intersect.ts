import { throwInternalError } from "@arktype/util"
import type { Node } from "../base.js"
import type { Inner, NodeDeclarationsByKind } from "../kinds.js"
import type { BaseNodeDeclaration } from "./declare.js"
import {
	nodeKinds,
	type NodeKind,
	type OrderedNodeKinds,
	type RefinementKind,
	type TypeKind
} from "./implement.js"

export const leftOperandOf = (l: Node, r: Node) => {
	for (const kind of nodeKinds) {
		if (l.kind === kind) {
			return l
		} else if (r.kind === kind) {
			return r
		}
	}
	return throwInternalError(
		`Unable to order unknown node kinds '${l.kind}' and '${r.kind}'.`
	)
}

type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

export type kindRightOf<kind extends NodeKind> = RightsByKind[kind]

export type typeKindRightOf<kind extends TypeKind> = Extract<
	RightsByKind[kind],
	TypeKind
>

type accumulateRightKinds<
	remaining extends readonly NodeKind[],
	result
> = remaining extends readonly [
	infer head extends NodeKind,
	...infer tail extends NodeKind[]
]
	? accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	: result

export type IntersectionMaps = {
	[k in NodeKind]: NodeDeclarationsByKind[k]["intersections"]
}

export type NodeIntersections<d extends BaseNodeDeclaration> = {
	[rKind in keyof d["intersections"]]: rKind extends "default"
		? (
				l: Node<d["kind"]>,
				r: Node<Exclude<kindRightOf<d["kind"]>, keyof d["intersections"]>>
		  ) => reifyIntersectionResult<d["intersections"][rKind]>
		: (
				l: Node<d["kind"]>,
				r: Node<rKind & NodeKind>
		  ) => reifyIntersectionResult<d["intersections"][rKind]>
}

export type reifyIntersections<
	lKind extends NodeKind,
	intersectionMap
> = lKind extends NodeKind
	? {
			[rKind in keyof intersectionMap]: rKind extends "default"
				? (
						l: Node<lKind>,
						r: Node<Exclude<kindRightOf<lKind>, keyof intersectionMap>>
				  ) => reifyIntersectionResult<intersectionMap[rKind]>
				: (
						l: Node<lKind>,
						r: Node<rKind & NodeKind>
				  ) => reifyIntersectionResult<intersectionMap[rKind]>
	  }
	: never

type reifyIntersectionResult<result> = result extends NodeKind
	? Inner<result>
	: result

export type intersectionOf<l extends NodeKind, r extends NodeKind> = [
	l,
	r
] extends [r, l]
	? instantiateIntersection<l>
	: asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = l extends unknown
	? r extends kindRightOf<l>
		? r extends keyof IntersectionMaps[l]
			? instantiateIntersection<IntersectionMaps[l][r]>
			: "default" extends keyof IntersectionMaps[l]
			? instantiateIntersection<IntersectionMaps[l]["default"]>
			: [l, r] extends [RefinementKind, RefinementKind]
			? null
			: never
		: never
	: never

type instantiateIntersection<result> = result extends NodeKind
	? Node<result>
	: result
