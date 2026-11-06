import { readsOnlyData, returnsReports, type Fn, type KeySet } from "@ark/util"
import type {
	ArrowFunctionExpression,
	Function,
	Node,
	ParamPattern
} from "oxc-parser"

// reads no files, so the docs playground proves of a function what a build does

type FunctionNode = Function | ArrowFunctionExpression

const transparentKinds = {
	TSAsExpression: 1,
	TSSatisfiesExpression: 1,
	TSTypeAssertion: 1,
	TSNonNullExpression: 1,
	TSInstantiationExpression: 1
} as const satisfies KeySet

type TransparentNode = Extract<Node, { type: keyof typeof transparentKinds }>

export const isTransparent = (node: Node): node is TransparentNode =>
	node.type in transparentKinds

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

const reportedKeys = new Set(["problem", "expected", "actual", "message"])

// a report that reads nothing a ctx holds, so can't throw for lack of one
const isPlainReport = (method: string, args: readonly Node[]): boolean => {
	if (args.length !== 1) return false
	const arg = args[0] as Node
	return (
		arg.type === "TemplateLiteral" ||
		(arg.type === "Literal" && typeof arg.value === "string") ||
		(method === "reject" &&
			arg.type === "ObjectExpression" &&
			arg.properties.every(
				(prop: Node) =>
					prop.type === "Property" &&
					prop.kind === "init" &&
					!prop.computed &&
					!prop.method &&
					prop.key.type === "Identifier" &&
					reportedKeys.has(prop.key.name)
			))
	)
}

// each read of its ctx is a return of ctx.mustBe(...) or ctx.reject(...), which
// return false, so where nothing reads its reports it can't tell it has no ctx
const returnsItsReports = (fn: FunctionNode): boolean => {
	const params = runtimeParamsOf(fn)
	const ctx = params[1]
	if (
		params.length !== 2 ||
		fn.async ||
		fn.generator ||
		ctx.type !== "Identifier" ||
		params[0].type === "AssignmentPattern" ||
		params[0].type === "RestElement"
	)
		return false
	const receivers = new Set<Node>()
	const returned = (node: Node): void => {
		if (isTransparent(node)) returned(node.expression)
		else if (node.type === "LogicalExpression") returned(node.right)
		else if (node.type === "ConditionalExpression") {
			returned(node.consequent)
			returned(node.alternate)
		} else if (
			node.type === "CallExpression" &&
			!node.optional &&
			node.callee.type === "MemberExpression" &&
			!node.callee.computed &&
			!node.callee.optional &&
			node.callee.object.type === "Identifier" &&
			node.callee.object.name === ctx.name &&
			(node.callee.property.name === "mustBe" ||
				node.callee.property.name === "reject") &&
			isPlainReport(node.callee.property.name, node.arguments)
		)
			receivers.add(node.callee.object)
	}
	const run = (node: Node | null): void => {
		if (node?.type === "ReturnStatement") {
			if (node.argument) returned(node.argument)
		} else if (node?.type === "BlockStatement")
			for (const statement of node.body) run(statement)
		else if (node?.type === "IfStatement") {
			run(node.consequent)
			run(node.alternate)
		}
	}
	if (fn.body?.type === "BlockStatement") run(fn.body)
	else if (fn.body) returned(fn.body)
	return (
		receivers.size > 0 &&
		!someNode(
			fn,
			node =>
				node.type === "Identifier" &&
				node !== ctx &&
				(node.name === "arguments" ||
					node.name === "eval" ||
					(node.name === ctx.name && !receivers.has(node)))
		)
	)
}

/** notes what a function a build wouldn't run can read, as it's created */
export const proveFunction = (
	fn: Fn,
	node: FunctionNode,
	// arktype compiles its own validators, knowing nothing of what a build reads
	isStandalone = true
): void => {
	if (readsOnlyItsArgument(node)) readsOnlyData.add(fn)
	else if (isStandalone && returnsItsReports(node)) returnsReports.add(fn)
}
