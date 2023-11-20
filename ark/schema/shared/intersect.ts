import { throwInternalError } from "@arktype/util"
import type { UnknownNode } from "../node.js"
import { nodeKinds, type NodeKind, type OrderedNodeKinds } from "./define.js"
import type { Node, NodeDeclarationsByKind } from "./node.js"

export const leftOperandOf = (l: UnknownNode, r: UnknownNode) => {
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

export type rightOf<kind extends NodeKind> = RightsByKind[kind]

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
	? r extends unknown
		? r extends keyof IntersectionMaps[l]
			? instantiateIntersection<IntersectionMaps[l][r]>
			: "default" extends keyof IntersectionMaps[l]
			  ? r extends rightOf<l>
					? instantiateIntersection<IntersectionMaps[l]["default"]>
					: never
			  : never
		: r
	: never

type instantiateIntersection<result> = result extends NodeKind
	? Node<result>
	: result
