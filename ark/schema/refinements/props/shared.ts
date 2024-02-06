import type { and } from "@arktype/util"
import type { Node } from "../../base.js"
import type { CompilationContext } from "../../shared/compile.js"
import type { BaseNodeDeclaration } from "../../shared/declare.js"
import type { PropKind } from "../../shared/implement.js"
import {
	compileSerializedValue,
	isDotAccessible,
	registry
} from "../../traversal/registry.js"
import type { NamedProp } from "./props.js"

export type BasePropDeclaration = and<BaseNodeDeclaration, { kind: PropKind }>

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = registry.register(arrayIndexMatcher)

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`

export const compilePresentPropApply = (
	node: NamedProp,
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
	node: NamedProp,
	ctx: CompilationContext
) =>
	`return this.${node.value.name}(${ctx.dataArg}${compilePropAccess(
		node.compiledKey
	)})`

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)
