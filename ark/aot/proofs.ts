import {
	readsOnlyData,
	returnsReports,
	testsOrRejects,
	type Fn,
	type KeySet
} from "@ark/util"
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

export const isNode = (value: unknown): value is Node =>
	typeof (value as Node | null)?.type === "string"

const someNode = (node: Node, test: (node: Node) => boolean): boolean => {
	if (test(node)) return true
	for (const k in node) {
		if (k === "parent") continue
		const value = node[k as keyof Node] as unknown
		for (const child of Array.isArray(value) ? value : [value])
			if (isNode(child) && someNode(child, test)) return true
	}
	return false
}

const isArgumentsOrEval = (node: Node): boolean =>
	node.type === "Identifier" &&
	(node.name === "arguments" || node.name === "eval")

// a param taking its argument as passed
const takesItsArgument = (param: ParamPattern): boolean =>
	param.type !== "AssignmentPattern" && param.type !== "RestElement"

// nothing it runs can read an argument past its one param
export const readsOnlyItsArgument = (fn: FunctionNode): boolean => {
	const params = runtimeParamsOf(fn)
	return (
		params.length === 1 &&
		takesItsArgument(params[0]) &&
		!someNode(fn, isArgumentsOrEval)
	)
}

const reportedKeys = new Set(["expected", "actual", "message"])

// a report that reads nothing a ctx holds, so can't throw for lack of one
const isPlainReport = (method: string, args: readonly Node[]): boolean => {
	if (args.length !== 1) return false
	const arg = args[0]
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
		!takesItsArgument(params[0])
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
				node !== ctx &&
				(isArgumentsOrEval(node) ||
					(node.type === "Identifier" &&
						node.name === ctx.name &&
						!receivers.has(node)))
		)
	)
}

/** what a narrow of the commonest shape tests of its data, and says */
export interface RejectingParts {
	// the parameter it tests
	data: Node & { name: string; start: number; end: number }
	test: Node & { start: number; end: number }
	// the message, a string's literal
	message: Node & { start: number; end: number }
}

const unwrapped = (node: Node): Node => {
	while (isTransparent(node)) node = node.expression
	return node
}

// A narrow written `(data, ctx) => test || ctx.reject({ message: "..." })`, or
// `test ? true : ctx.reject(...)`, as most reporting a message of their own
// are: what it tests, which names its ctx nowhere, and the message. Only its
// truthiness is read, so the two are one. All it asks of its ctx is to reject
// with that message, which is a predicate's issue saying it, at the path and
// of the data it was passed
export const rejectingPartsOf = (fn: Node): RejectingParts | undefined => {
	if (
		fn.type !== "ArrowFunctionExpression" ||
		fn.async ||
		fn.params.length !== 2
	)
		return
	const [data, ctx] = fn.params
	if (data.type !== "Identifier" || ctx.type !== "Identifier") return
	const returned =
		fn.body.type !== "BlockStatement" ? fn.body
		: fn.body.body.length === 1 && fn.body.body[0].type === "ReturnStatement" ?
			fn.body.body[0].argument
		:	undefined
	const body = returned && unwrapped(returned)
	const [test, report] =
		body?.type === "LogicalExpression" && body.operator === "||" ?
			[body.left, body.right]
		: (
			body?.type === "ConditionalExpression" &&
			body.consequent.type === "Literal" &&
			body.consequent.value === true
		) ?
			[body.test, body.alternate]
		:	[]
	if (!test || !report) return
	const call = unwrapped(report)
	if (
		call.type !== "CallExpression" ||
		call.optional ||
		call.arguments.length !== 1 ||
		call.callee.type !== "MemberExpression" ||
		call.callee.computed ||
		call.callee.optional ||
		call.callee.property.name !== "reject" ||
		call.callee.object.type !== "Identifier" ||
		call.callee.object.name !== ctx.name
	)
		return
	const [input] = call.arguments
	if (input.type !== "ObjectExpression" || input.properties.length !== 1) return
	const [property] = input.properties
	if (
		property.type !== "Property" ||
		property.kind !== "init" ||
		property.computed ||
		property.shorthand ||
		property.key.type !== "Identifier" ||
		property.key.name !== "message" ||
		property.value.type !== "Literal" ||
		typeof property.value.value !== "string"
	)
		return
	// what it tests can't reach its ctx: by name, which misses nothing a
	// binding would find, nor through what a direct eval reads
	if (
		someNode(
			test,
			node =>
				isArgumentsOrEval(node) ||
				(node.type === "Identifier" && node.name === ctx.name)
		)
	)
		return
	return { data, test, message: property.value }
}

/** notes what a function a build wouldn't run can read, as it's created */
export const proveFunction = (
	fn: Fn,
	node: FunctionNode,
	// arktype compiles its own validators, knowing nothing of what a build reads
	isStandalone: boolean
): void => {
	if (readsOnlyItsArgument(node)) readsOnlyData.add(fn)
	else if (isStandalone && returnsItsReports(node)) {
		returnsReports.add(fn)
		if (rejectingPartsOf(node)) testsOrRejects.add(fn)
	}
}
