import { throwParseError, type PartialRecord } from "@arktype/util"
import { BaseNode, type Node, type TypeNode, type TypeSchema } from "../base.js"
import type {
	CompilationContext,
	ScopeNode,
	TraverseAllows,
	TraverseApply
} from "../scope.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { NodeKind, RefinementKind } from "../shared/define.js"
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

export abstract class RefinementTrait<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> {
	abstract kind: RefinementKind
	abstract scope: ScopeNode
	abstract getCheckedDefinitions(): readonly TypeSchema[]
	abstract traverseAllows: TraverseAllows<d["checks"]>
	abstract description: string

	traverseApply: TraverseApply<d["checks"]> = (data, ctx) => {
		if (!this.traverseAllows(data, ctx)) {
			ctx.problems.add(this.description)
		}
	}

	assertValidBasis(basis: Node<BasisKind> | undefined) {
		cache[this.kind] ??= this.getCheckedDefinitions().map((o) =>
			this.scope.parseTypeNode(o)
		)
		const allowed = cache[this.kind]!
		if (!allowed.some((o) => basis?.extends(o))) {
			throwParseError(
				`${this.kind} operand must be of type ${allowed.join(
					" or "
				)} (was ${getBasisName(basis)})`
			)
		}
	}
}
