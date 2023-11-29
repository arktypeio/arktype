import { throwParseError, type extend } from "@arktype/util"
import type { Node } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type {
	BaseNodeDeclaration,
	validateNodeDeclaration
} from "../shared/declare.js"
import {
	defineNode,
	typeKinds,
	type NodeImplementationInput,
	type RefinementKind,
	type TypeKind
} from "../shared/define.js"
import type { Declaration, Schema } from "../shared/nodes.js"
import type { TypeNode } from "../type.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export type RefinementImplementationInput<d extends BaseNodeDeclaration> =
	extend<
		NodeImplementationInput<d>,
		{
			operand: readonly Schema<TypeKind>[]
		}
	>

export type RefinementOperandAssertion = (
	basis: Node<BasisKind> | undefined
) => void

export type declareRefinement<
	types extends validateNodeDeclaration<types, "operand"> & {
		operand: unknown
	}
> = types & { attach: { assertValidBasis: RefinementOperandAssertion } }

export const createValidBasisAssertion = (node: Node<RefinementKind>) => {
	const operandsDef: readonly Schema<TypeKind>[] = (node.implementation as any)
		.operand
	const operands: readonly TypeNode[] = operandsDef.map((o) =>
		node.scope.parseSchemaFromKinds(typeKinds, o)
	)
	return operands.length === 1 && operands[0].isUnknown()
		? () => {}
		: (basis: Node<BasisKind> | undefined) => {
				if (!operands.some((o) => basis?.extends(o))) {
					throwParseError(
						`${node.kind} operand must be of type ${operandsDef.join(
							" or "
						)} (was ${getBasisName(basis)})`
					)
				}
		  }
}

export const defineRefinement = <
	kind extends RefinementKind,
	input extends RefinementImplementationInput<Declaration<kind>>
>(
	refinementDef: { kind: kind } & input
) => {
	return defineNode(refinementDef as never)
}
