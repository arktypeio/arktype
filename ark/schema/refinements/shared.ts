import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import type { Node } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type {
	BaseNodeDeclaration,
	validateNodeDeclaration
} from "../shared/declare.js"
import {
	defineNode,
	typeKinds,
	type BaseInitializedNode,
	type NodeParserImplementation,
	type RefinementKind,
	type TypeKind
} from "../shared/define.js"
import type { Declaration, Schema } from "../shared/nodes.js"
import type { TypeNode } from "../type.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export type RefinementImplementationInput<d extends BaseNodeDeclaration> =
	extend<
		NodeParserImplementation<d>,
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

const cache = {} as PartialRecord<RefinementKind, readonly TypeNode[]>

export const createValidBasisAssertion = (
	node: BaseInitializedNode<RefinementKind>
) => {
	if (!cache[node.kind]) {
		const operandsDef: readonly Schema<TypeKind>[] = (
			node.implementation as any
		).operand
		cache[node.kind] = operandsDef.map((o) => node.scope.parseTypeNode(o))
	}
	const operands = cache[node.kind]!
	return operands.length === 1 && operands[0].isUnknown()
		? () => {}
		: (basis: Node<BasisKind> | undefined) => {
				if (!operands.some((o) => basis?.extends(o))) {
					throwParseError(
						`${node.kind} operand must be of type ${operands.join(
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
