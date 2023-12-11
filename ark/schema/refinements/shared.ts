import { throwParseError, type PartialRecord } from "@arktype/util"
import { BaseNode, type Node, type TypeNode, type TypeSchema } from "../base.js"
import type { CompilationContext, TraverseApply } from "../scope.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { NodeKind } from "../shared/define.js"
import { isDotAccessible } from "../shared/registry.js"
import type { BasisKind } from "../types/basis.js"

export type NamedPropKind = "required" | "optional"

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`

export const compilePresentProp = (
	node: Node<NamedPropKind>,
	ctx: CompilationContext
) => {
	if (ctx.compilationKind === "allows") {
		return `return this.${node.value.id}(${ctx.argName}${compilePropAccess(
			node.compiledKey
		)})`
	}
	return `problems.currentPath.push(${node.serializedKey})
	this.${node.value.id}(${ctx.argName}${compilePropAccess(
		node.compiledKey
	)}, problems)
	problems.currentPath.pop()
	`
}

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
