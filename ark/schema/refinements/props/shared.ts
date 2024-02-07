import { compileSerializedValue, reference, type evaluate } from "@arktype/util"
import type { NodeCompiler } from "../../shared/compile.js"
import type { BaseNodeDeclaration } from "../../shared/declare.js"
import type { PropKind } from "../../shared/implement.js"
import type { NamedProp } from "./props.js"

export type BasePropDeclaration = evaluate<
	BaseNodeDeclaration & { kind: PropKind }
>

export const arrayIndexMatcher = /(?:0|(?:[1-9]\\d*))$/

export const arrayIndexMatcherReference = reference(arrayIndexMatcher)

export const compilePresentPropApply = (node: NamedProp, js: NodeCompiler) =>
	js
		.line(`${js.ctx}.path.push(${node.serializedKey})`)
		.line(js.invoke(node.value, js.prop(js.data, node.key)))
		.line(`${js.ctx}.path.pop()`)

export const compilePresentPropAllows = (node: NamedProp, js: NodeCompiler) =>
	js.if(`!${js.invoke(node.value, js.prop(js.data, node.key))}`, () =>
		js.return(false)
	)

export const compileKey = (k: string | symbol) =>
	typeof k === "string" ? k : compileSerializedValue(k)
