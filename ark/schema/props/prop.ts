import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import {
	BaseNode,
	type Node,
	type NodeSubclass,
	type TypeNode,
	type TypeSchema
} from "../base.js"
import { getBasisName } from "../refinements/refinement.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { BasisKind, NodeKind, PropKind } from "../shared/define.js"

export type BasePropDeclaration = extend<
	BaseNodeDeclaration,
	{ kind: PropKind }
>

const cache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export abstract class BaseProp<
	d extends BasePropDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<d["prerequisite"], d, subclass> {
	abstract getCheckedDefinitions(): readonly TypeSchema[]
	readonly checks: readonly TypeNode[] =
		cache[this.kind] ??
		(cache[this.kind] = this.getCheckedDefinitions().map((o) =>
			this.$.parseTypeNode(o)
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
