import { isArray, readsOnlyData, type Fn } from "@ark/util"
import type {
	ArrowFunctionExpression,
	Function,
	Node,
	ParamPattern
} from "oxc-parser"

// reads no files, so the docs playground proves of a function what a build does

type FunctionNode = Function | ArrowFunctionExpression

// a TypeScript `this` parameter types the receiver and takes no argument
export const runtimeParamsOf = (fn: {
	params: ParamPattern[]
}): ParamPattern[] =>
	fn.params[0]?.type === "Identifier" && fn.params[0].name === "this" ?
		fn.params.slice(1)
	:	fn.params

const isNode = (value: unknown): value is Node =>
	typeof (value as Node | null)?.type === "string"

const readsArgumentsOrEval = (node: Node): boolean => {
	if (
		node.type === "Identifier" &&
		(node.name === "arguments" || node.name === "eval")
	)
		return true
	for (const k in node) {
		if (k === "parent") continue
		const value = node[k as keyof Node] as unknown
		for (const child of isArray(value) ? value : [value])
			if (isNode(child) && readsArgumentsOrEval(child)) return true
	}
	return false
}

/** notes a function that can read no argument past its one param, as it's created */
export const proveFunction = (fn: Fn, node: FunctionNode): void => {
	const params = runtimeParamsOf(node)
	if (
		params.length === 1 &&
		params[0].type !== "AssignmentPattern" &&
		params[0].type !== "RestElement" &&
		!readsArgumentsOrEval(node)
	)
		readsOnlyData.add(fn)
}
