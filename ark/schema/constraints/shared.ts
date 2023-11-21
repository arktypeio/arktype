import type { extend } from "@arktype/util"
import type { BasisKind } from "../bases/basis.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import {
	defineNode,
	type ConstraintKind,
	type NodeImplementationInput,
	type instantiateNodeImplementation
} from "../shared/define.js"
import type { Declaration, Node } from "../shared/node.js"

export interface BaseConstraint {
	implicitBasis: Node<BasisKind>
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export type ConstraintImplementationInput<d extends BaseNodeDeclaration> =
	extend<
		NodeImplementationInput<d>,
		{
			writeInvalidBasisMessage: (basis: string) => string
			attach: (node: Node<d["kind"]>) => {
				implicitBasis: Node<BasisKind> | undefined
			}
		}
	>

export function defineConstraint<
	kind extends ConstraintKind,
	input extends ConstraintImplementationInput<Declaration<kind>>
>(input: { kind: kind } & input): instantiateNodeImplementation<input>
export function defineConstraint(input: NodeImplementationInput<any>) {
	return defineNode(input)
}
