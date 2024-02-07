import type { evaluate } from "@arktype/util"
import type { BaseNodeDeclaration } from "../../shared/declare.js"
import type { PropKind } from "../../shared/implement.js"
import {
	compileSerializedValue,
	isDotAccessible,
	registry
} from "../../traversal/registry.js"
import type { NamedProp } from "./props.js"
import type { NodeCompiler } from "../../shared/compile.js"

export type BasePropDeclaration = evaluate<
	BaseNodeDeclaration & { kind: PropKind }
>

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = registry.register(arrayIndexMatcher)

export const compilePropAccess = (name: string, optional = false) =>
	isDotAccessible(name)
		? `${optional ? "?" : ""}.${name}`
		: `${optional ? "?." : ""}[${JSON.stringify(name)}]`

export const compilePresentPropApply = (node: NamedProp, js: NodeCompiler) => {
	return `${js.ctx}.path.push(${node.serializedKey})
	this.${node.value.name}(${js.data}${compilePropAccess(node.compiledKey)}, ${
		js.ctx
	})
	${js.ctx}.path.pop()\n`
}

export const compilePresentPropAllows = (node: NamedProp, js: NodeCompiler) =>
	`return this.${node.value.name}(${js.data}${compilePropAccess(
		node.compiledKey
	)})`

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)
