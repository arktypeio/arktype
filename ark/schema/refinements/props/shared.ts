import type { Node } from "../../base.js"
import type { CompilationContext } from "../../scope.js"
import { isDotAccessible } from "../../shared/registry.js"

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
		return `return this.${node.value.id}(${ctx.arg}${compilePropAccess(
			node.compiledKey
		)})`
	}
	return `problems.currentPath.push(${node.serializedKey})
	this.${node.value.id}(${ctx.arg}${compilePropAccess(
		node.compiledKey
	)}, problems)
	problems.currentPath.pop()
	`
}
