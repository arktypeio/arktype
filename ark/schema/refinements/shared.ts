import { throwParseError, type extend } from "@arktype/util"
import type { BasisKind } from "../bases/basis.js"
import type { Node } from "../parse.js"
import type { Builtins } from "../shared/builtins.js"
import type {
	BaseNodeDeclaration,
	validateNodeDeclaration
} from "../shared/declare.js"
import {
	defineNode,
	type NodeImplementationInput,
	type RefinementKind
} from "../shared/define.js"
import type { Declaration } from "../shared/nodes.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export type RefinementImplementationInput<d extends BaseNodeDeclaration> =
	extend<
		NodeImplementationInput<d>,
		{
			operands: (keyof Builtins)[]
		}
	>

export type RefinementOperandAssertion = (
	basis: Node<BasisKind> | undefined
) => void

export type declareRefinement<
	types extends validateNodeDeclaration<types, "operands"> & {
		operands: unknown
	}
> = types & { attach: { assertValidBasis: RefinementOperandAssertion } }

export const createValidBasisAssertion =
	(node: Node<RefinementKind>) => (basis: Node<BasisKind> | undefined) => {
		const operands = (node.implementation as any).operands as (keyof Builtins)[]
		if (
			!operands.some((operand) => basis?.extends(node.cls.builtins[operand]))
		) {
			throwParseError(
				`${node.kind} bound operand must be of type ${operands.join(
					" or "
				)} (was ${getBasisName(basis)})`
			)
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
