import type { extend } from "@arktype/util"
import type { Node } from "../../base.js"
import { In, type CompilationContext } from "../../shared/compilation.js"
import type { NodeAttachments } from "../../shared/declare.js"
import { isDotAccessible } from "../../shared/registry.js"
import type { PropKind } from "./prop.js"

export type NamedPropAttachments = extend<
	NodeAttachments<PropKind>,
	{
		serializedKey: string
		compiledKey: string
	}
>

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`

export const compilePresentProp = (
	node: Node<PropKind>,
	ctx: CompilationContext
) => {
	if (ctx.compilationKind === "allows") {
		return `return this.${node.value.id}(${In}${compilePropAccess(
			node.compiledKey
		)})`
	}
	return `problems.currentPath.push(${node.serializedKey})
	this.${node.value.id}(${In}${compilePropAccess(node.compiledKey)}, problems)
	problems.currentPath.pop()
	`
}
