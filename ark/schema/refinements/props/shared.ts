import type { and } from "@arktype/util"
import { js, type CompilationContext } from "../../shared/compile.js"
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
	return `${js.ctx}.path.push(${node.serializedKey})
	this.${node.value.name}(${js.data}${compilePropAccess(node.compiledKey)}, ${
		js.ctx
	})
	${js.ctx}.path.pop()
	`
}

export const compilePresentPropAllows = (
	node: NamedProp,
	ctx: CompilationContext
) =>
	`return this.${node.value.name}(${js.data}${compilePropAccess(
		node.compiledKey
	)})`

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)
