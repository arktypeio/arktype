import type { KeySet } from "arktype/util"
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

const isFunction = (node: Node): node is FunctionNode =>
	node.type === "ArrowFunctionExpression" ||
	node.type === "FunctionExpression" ||
	node.type === "FunctionDeclaration"

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

// what raises its issue spreads each, which anything but an array may fail:
// one an array's literal writes can't, whichever of two a condition picks
const reportedPaths = new Set(["path", "relativePath", "prefixPath"])

const isArrayLiteral = (node: Node): boolean => {
	const value = unwrapped(node)
	return (
		value.type === "ArrayExpression" ||
		(value.type === "ConditionalExpression" &&
			isArrayLiteral(value.consequent) &&
			isArrayLiteral(value.alternate))
	)
}

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
					(reportedKeys.has(prop.key.name) ||
						(reportedPaths.has(prop.key.name) && isArrayLiteral(prop.value)))
			))
	)
}

// each read of its ctx is a return of ctx.mustBe(...) or ctx.reject(...), which
// return false, so where nothing reads its reports it can't tell it has no ctx
export const returnsItsReports = (fn: FunctionNode): boolean => {
	const params = runtimeParamsOf(fn)
	const ctx = params[1]
	// what calls it passes its data and its ctx, so a param past them is undefined
	if (
		params.length < 2 ||
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

/**
 * whether what it returns of data it passes is the same with no ctx: it reads
 * none, or reads its own only to return a report, which no data passing makes
 */
export const passesWithoutCtx = (fn: FunctionNode): boolean =>
	readsOnlyItsArgument(fn) || returnsItsReports(fn)

/** what a narrow of the commonest shape tests of its data, and says */
export interface RejectingParts {
	// the parameter it tests
	data: Node & { name: string; start: number; end: number }
	test: Node & { start: number; end: number }
	// the message, which is never undefined
	message: Node & { start: number; end: number }
	// whether data fails where the test holds, rather than where it doesn't
	fails: boolean
}

// a message's expression that can't be undefined, which a report would raise
// as no message at all: `said ?? "Required."`, where a param nothing passes
// is `said`
const isNeverUndefined = (node: Node): boolean => {
	const value = unwrapped(node)
	return (
		value.type === "Literal" ||
		value.type === "TemplateLiteral" ||
		(value.type === "LogicalExpression" &&
			value.operator !== "&&" &&
			isNeverUndefined(value.right)) ||
		(value.type === "ConditionalExpression" &&
			isNeverUndefined(value.consequent) &&
			isNeverUndefined(value.alternate))
	)
}

const unwrapped = (node: Node): Node => {
	while (isTransparent(node)) node = node.expression
	return node
}

// A narrow written `(data, ctx) => test || ctx.reject({ message: "..." })`, or
// `test ? true : ctx.reject(...)`, as most reporting a message of their own
// are, or testing what fails: `fails ? ctx.reject(...) : true`, or `if (fails)
// return ctx.reject(...)` then `return true`. What it tests, which names its
// ctx nowhere, and the message. Only its truthiness is read, so they're one.
// All it asks of its ctx is to reject with that message, which is a
// predicate's issue saying it, at the path and of the data it was passed
export const rejectingPartsOf = (fn: Node): RejectingParts | undefined => {
	if (!isFunction(fn) || fn.async || fn.generator || !fn.body) return
	const [data, ctx] = runtimeParamsOf(fn)
	if (data?.type !== "Identifier" || ctx?.type !== "Identifier") return
	const isTrue = (node: Node | null): boolean => {
		const value = node && unwrapped(node)
		return value?.type === "Literal" && value.value === true
	}
	const returnedBy = (statement: Node | undefined): Node | null | undefined =>
		statement?.type === "ReturnStatement" ? statement.argument
		: statement?.type === "BlockStatement" && statement.body.length === 1 ?
			returnedBy(statement.body[0])
		:	undefined
	const statements =
		fn.body.type === "BlockStatement" ? fn.body.body : undefined
	const [first, last] = statements ?? []
	// `if (fails) return ctx.reject(...)`, then `return true`
	const guarded =
		(
			statements?.length === 2 &&
			first.type === "IfStatement" &&
			!first.alternate &&
			isTrue(returnedBy(last) ?? null)
		) ?
			first
		:	undefined
	const returned =
		!statements ? fn.body
		: statements.length === 1 ? returnedBy(first)
		: undefined
	const body = returned && unwrapped(returned)
	const [test, report, fails = false] =
		guarded ? [guarded.test, returnedBy(guarded.consequent), true]
		: body?.type === "LogicalExpression" && body.operator === "||" ?
			[body.left, body.right]
		: body?.type !== "ConditionalExpression" ? []
		: isTrue(body.consequent) ? [body.test, body.alternate]
		: isTrue(body.alternate) ? [body.test, body.consequent, true]
		: []
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
	const receiver = call.callee.object
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
		!isNeverUndefined(property.value)
	)
		return
	// nothing else it runs can reach its ctx: by name, which misses nothing a
	// binding would find, nor through what a direct eval reads
	if (
		someNode(
			fn,
			node =>
				node !== ctx &&
				node !== receiver &&
				(isArgumentsOrEval(node) ||
					(node.type === "Identifier" && node.name === ctx.name))
		)
	)
		return
	return { data, test, message: property.value, fails }
}
