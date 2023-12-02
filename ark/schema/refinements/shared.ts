import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import type { BaseAttachments, Node } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import { composeParser } from "../parse.js"
import type {
	BaseNodeDeclaration,
	validateNodeDeclaration
} from "../shared/declare.js"
import type {
	NodeParserImplementation,
	RefinementKind,
	TypeKind
} from "../shared/define.js"
import type { Schema } from "../shared/nodes.js"
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

export const composeOperandAssertion = (inner: BaseAttachments) => {
	if (!cache[inner.kind]) {
		const operandsDef: readonly Schema<TypeKind>[] = (
			inner.implementation as any
		).operand
		cache[inner.kind] = operandsDef.map((o) => inner.scope.parseTypeNode(o))
	}
	const operands = cache[inner.kind]!
	return operands.length === 1 && operands[0].isUnknown()
		? () => {}
		: (basis: Node<BasisKind> | undefined) => {
				if (!operands.some((o) => basis?.extends(o))) {
					throwParseError(
						`${inner.kind} operand must be of type ${operands.join(
							" or "
						)} (was ${getBasisName(basis)})`
					)
				}
		  }
}

export const composeRefinement = <d extends BaseNodeDeclaration>(
	impl: RefinementImplementationInput<d>
) => composeParser(impl)
