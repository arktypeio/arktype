import { throwParseError, type PartialRecord, type and } from "@arktype/util"
import {
	BaseNode,
	type Node,
	type NodeSubclass,
	type TypeNode,
	type TypeSchema
} from "../base.js"
import { getBasisName } from "../refinements/refinement.js"
import type { CompilationContext } from "../shared/compile.js"
import type { BaseConstraint, BaseNodeDeclaration } from "../shared/declare.js"
import type { BasisKind, NodeKind, PropKind } from "../shared/define.js"
import {
	compileSerializedValue,
	isDotAccessible
} from "../traversal/registry.js"

export type BasePropDeclaration = and<BaseNodeDeclaration, { kind: PropKind }>

const cache = {} as PartialRecord<NodeKind, readonly TypeNode[]>

export type NamedPropKind = "required" | "optional"

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`

export const compilePresentPropApply = (
	node: Node<NamedPropKind>,
	ctx: CompilationContext
) => {
	return `${ctx.ctxArg}.path.push(${node.serializedKey})
	this.${node.value.name}(${ctx.dataArg}${compilePropAccess(node.compiledKey)}, ${
		ctx.ctxArg
	})
	${ctx.ctxArg}.path.pop()
	`
}

export const compilePresentPropAllows = (
	node: Node<NamedPropKind>,
	ctx: CompilationContext
) =>
	`return this.${node.value.name}(${ctx.dataArg}${compilePropAccess(
		node.compiledKey
	)})`

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)

export abstract class BaseProp<
		d extends BasePropDeclaration,
		subclass extends NodeSubclass<d>
	>
	extends BaseNode<d["prerequisite"], d, subclass>
	implements BaseConstraint
{
	abstract getCheckedDefinitions(): readonly TypeSchema[]
	readonly checks: readonly TypeNode[] =
		cache[this.kind] ??
		(cache[this.kind] = this.getCheckedDefinitions().map((o) =>
			this.$.parseTypeNode(o)
		))

	readonly constraintGroup = "deep"

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
