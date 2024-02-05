import type { and } from "@arktype/util"
import type { Node } from "../../base.js"
import type { CompilationContext } from "../../shared/compile.js"
import type { BaseNodeDeclaration } from "../../shared/declare.js"
import type { PropKind } from "../../shared/implement.js"
import {
	compileSerializedValue,
	isDotAccessible
} from "../../traversal/registry.js"
import type { IntersectionInner } from "../../types/intersection.js"

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

export type PropsInner = Pick<IntersectionInner, PropKind>

export const compileProps = (props: PropsInner, ctx: CompilationContext) => {
	// if (props.sequence || props.index) {
	// }
}

type NamedPropsInner = Pick<PropsInner, "required" | "optional">

const compileLooseNamedProps = (
	props: NamedPropsInner,
	ctx: CompilationContext
) => {
	let body = ""
	props.required?.forEach((prop) => {
		body += prop.compileApply(ctx)
	})
}
