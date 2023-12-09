import { throwParseError, type PartialRecord } from "@arktype/util"
import { BaseNode, type Node, type TypeNode, type TypeSchema } from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { NodeKind } from "../shared/define.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

const cache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export abstract class RefinementNode<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> extends BaseNode<any, d> {
	abstract getCheckedDefinitions(): readonly TypeSchema[]
	readonly checks: readonly TypeNode[] =
		cache[this.kind] ??
		(cache[this.kind] = this.getCheckedDefinitions().map((o) =>
			this.scope.parseTypeNode(o)
		))

	assertValidBasis(basis: Node<BasisKind> | undefined) {
		if (this.checks.length === 1 && this.checks[0].isUnknown()) {
			return
		}
		if (!this.checks.some((o) => basis?.extends(o))) {
			throwParseError(
				`${this.kind} operand must be of type ${this.checks.join(
					" or "
				)} (was ${getBasisName(basis)})`
			)
		}
	}
}
