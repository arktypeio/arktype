import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import type { Node } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type {
	BaseNodeDeclaration,
	validateNodeDeclaration
} from "../shared/declare.js"
import {
	defineNode,
	type NodeImplementationInput,
	type RefinementKind,
	type SchemaKind
} from "../shared/define.js"
import type { Declaration, Definition } from "../shared/nodes.js"
import type { Schema } from "../type.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export type RefinementImplementationInput<d extends BaseNodeDeclaration> =
	extend<
		NodeImplementationInput<d>,
		{
			operand: readonly Definition<SchemaKind>[]
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

const operandCache = {} as PartialRecord<RefinementKind, Schema>

export const createValidBasisAssertion = (node: Node<RefinementKind>) => {
	const operandsDef: readonly Definition<SchemaKind>[] = (
		node.implementation as any
	).operand
	if (operandCache[node.kind] === undefined) {
		operandCache[node.kind] = node.scope.branches(...operandsDef)
	}
	const operand = operandCache[node.kind]!
	return operand.isUnknown()
		? () => {}
		: (basis: Node<BasisKind> | undefined) => {
				if (!basis?.extends(operand)) {
					throwParseError(
						`${node.kind} bound operand must be of type ${operandsDef.join(
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
