import { throwParseError, type PartialRecord, type extend } from "@arktype/util"
import {
	BaseNode,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "../base.js"
import type { BasisKind } from "../bases/basis.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type {
	NodeKind,
	NodeParserImplementation,
	TypeKind
} from "../shared/define.js"
import type { Schema } from "../shared/nodes.js"
import { arkKind } from "../shared/symbols.js"

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

const cache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export abstract class RefinementNode<
	subclass extends NodeSubclass<subclass["declaration"]>
> extends BaseNode<subclass> {
	readonly [arkKind] = "refinementNode"

	abstract getCheckedDefinitions(): readonly Schema<TypeKind>[]
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
