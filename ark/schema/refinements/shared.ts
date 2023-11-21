import type { extend } from "@arktype/util"
import type { BasisKind } from "../bases/basis.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import {
	defineNode,
	type NodeImplementationInput,
	type RefinementKind,
	type instantiateNodeImplementation
} from "../shared/define.js"
import type { Declaration, Node } from "../shared/node.js"

export interface BaseRefinement {
	implicitBasis: Node<BasisKind>
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export type RefinementImplementationInput<d extends BaseNodeDeclaration> =
	extend<
		NodeImplementationInput<d>,
		{
			writeInvalidBasisMessage: (basis: string) => string
			attach: (node: Node<d["kind"]>) => {
				implicitBasis: Node<BasisKind> | undefined
			}
		}
	>

export function defineRefinement<
	kind extends RefinementKind,
	input extends RefinementImplementationInput<Declaration<kind>>
>(input: { kind: kind } & input): instantiateNodeImplementation<input>
export function defineRefinement(input: NodeImplementationInput<any>) {
	return defineNode(input)
}
