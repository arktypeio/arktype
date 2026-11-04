import { readsOnlyData, type Fn } from "@ark/util"
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

const someNode = (node: Node, test: (node: Node) => boolean): boolean => {
	if (test(node)) return true
	for (const k in node) {
		if (k === "parent") continue
		const value = node[k as keyof Node] as unknown
		if (someIn(Array.isArray(value) ? value : [value], test)) return true
	}
	return false
}

const someIn = (
	values: readonly unknown[],
	test: (node: Node) => boolean
): boolean => values.some(value => isNode(value) && someNode(value, test))

// nothing it runs can read an argument past its one param
export const readsOnlyItsArgument = (fn: FunctionNode): boolean => {
	const params = runtimeParamsOf(fn)
	return (
		params.length === 1 &&
		params[0].type !== "AssignmentPattern" &&
		params[0].type !== "RestElement" &&
		!someNode(
			fn,
			node =>
				node.type === "Identifier" &&
				(node.name === "arguments" || node.name === "eval")
		)
	)
}

/** notes what a function a build wouldn't run can read, as it's created */
export const proveFunction = (fn: Fn, node: FunctionNode): void => {
	if (readsOnlyItsArgument(node)) readsOnlyData.add(fn)
}
