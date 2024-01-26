import type { and } from "@arktype/util"
import type { Node } from "../base.js"
import type { CompilationContext } from "../shared/compile.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { PropKind } from "../shared/define.js"
import {
	compileSerializedValue,
	isDotAccessible
} from "../traversal/registry.js"

export type BasePropDeclaration = and<BaseNodeDeclaration, { kind: PropKind }>

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
