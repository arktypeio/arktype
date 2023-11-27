import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import type { Node } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { Schema } from "../schema.js"
import type {
	BaseNodeDeclaration,
	validateNodeDeclaration
} from "../shared/declare.js"
import {
	defineNode,
	schemaKinds,
	type NodeImplementationInput,
	type RefinementKind,
	type SchemaKind
} from "../shared/define.js"
import type { Declaration, Definition } from "../shared/nodes.js"

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

const operandCache = {} as PartialRecord<RefinementKind, readonly Schema[]>

export const createValidBasisAssertion = (node: Node<RefinementKind>) => {
	const operandsDef: readonly Definition<SchemaKind>[] = (
		node.implementation as any
	).operand
	const operands: readonly Schema[] = operandsDef.map((o) =>
		node.space.schemaFromKinds(schemaKinds, o)
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
