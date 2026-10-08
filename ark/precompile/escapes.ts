import type { CallExpression, MemberExpression, Node } from "oxc-parser"
import { isFunctionNode, type FunctionNode, type ModuleGraph } from "./graph.ts"
import type { SourceModule } from "./module.ts"
import type { Binding } from "./scope.ts"

export interface Escape {
	node: Node
	message: string
}

interface EscapeState {
	module: SourceModule
	graph: ModuleGraph
	seen: Set<Node | Binding>
}

// an object is proven if its module never writes to it and it reaches only property reads, static helpers, arktype calls and definitions
export const findEscape = (
	binding: Binding,
	module: SourceModule,
	graph: ModuleGraph
): Escape | undefined =>
	escapeOfBinding(binding, { module, graph, seen: new Set() })

const escapeOfBinding = (
	binding: Binding,
	s: EscapeState
): Escape | undefined => {
	if (s.seen.has(binding)) return
	s.seen.add(binding)
	if (binding.exportNames.length)
		return { node: binding.id, message: "is exported" }
	for (const reference of binding.references) {
		if (reference.isWrite) continue
		const escape = escapeOfValue(reference.id, s)
		if (escape) return escape
	}
}

const escapeOfValue = (node: Node, s: EscapeState): Escape | undefined => {
	const parent = node.parent!
	switch (parent.type) {
		case "TSAsExpression":
		case "TSSatisfiesExpression":
		case "TSTypeAssertion":
		case "TSNonNullExpression":
		case "TSInstantiationExpression":
		case "ParenthesizedExpression":
		case "ChainExpression":
		case "LogicalExpression":
		case "ArrayExpression":
			return escapeOfValue(parent, s)
		case "ConditionalExpression":
			return parent.test === node ? undefined : escapeOfValue(parent, s)
		case "SequenceExpression":
			return parent.expressions[parent.expressions.length - 1] === node ?
					escapeOfValue(parent, s)
				:	undefined
		case "MemberExpression":
			return parent.object === node ? escapeOfMember(parent, s) : undefined
		case "Property":
			return (
					parent.value === node && parent.parent?.type === "ObjectExpression"
				) ?
					escapeOfValue(parent.parent, s)
				:	undefined
		case "SpreadElement": {
			const container = parent.parent!
			return container.type === "CallExpression" ?
					escapeOfArgument(container, parent, s)
				:	escapeOfValue(container, s)
		}
		case "CallExpression":
			return parent.callee === node ?
					undefined
				:	escapeOfArgument(parent, node, s)
		case "VariableDeclarator":
			return parent.init === node ? escapeOfPattern(parent.id, s) : undefined
		case "AssignmentExpression":
			if (parent.left === node) return
			return parent.left.type === "Identifier" ?
					escapeOfPattern(parent.left, s)
				:	{
						node: parent,
						message: `is stored by \`${s.module.snippetOf(parent)}\``
					}
		case "ReturnStatement":
			return escapeOfReturn(enclosingFunctionOf(parent), s)
		case "ArrowFunctionExpression":
			return parent.body === node ? escapeOfReturn(parent, s) : undefined
		case "ExportSpecifier":
		case "ExportDefaultDeclaration":
			return { node: parent, message: "is exported" }
		case "TemplateLiteral":
		case "BinaryExpression":
		case "UnaryExpression":
		case "ExpressionStatement":
		case "IfStatement":
		case "WhileStatement":
		case "DoWhileStatement":
		case "ForStatement":
		case "ForInStatement":
		case "SwitchStatement":
		case "SwitchCase":
		case "TaggedTemplateExpression":
			return
	}
	return {
		node: parent,
		message: `is used by \`${s.module.snippetOf(parent)}\``
	}
}

const escapeOfMember = (
	member: MemberExpression,
	s: EscapeState
): Escape | undefined => {
	let end: Node = member
	while (end.parent?.type === "MemberExpression" && end.parent.object === end)
		end = end.parent
	if (isWriteTarget(end)) {
		const write = end.parent!
		return {
			node: write,
			message: `is written by \`${s.module.snippetOf(write)}\``
		}
	}
	const parent = end.parent!
	if (
		parent.type !== "CallExpression" ||
		parent.callee !== end ||
		end.type !== "MemberExpression"
	)
		return escapeOfValue(end, s)
	const method =
		end.computed ? undefined : (end.property as { name: string }).name
	if (method && method in mutatingMethods) {
		return {
			node: parent,
			message: `is written by \`${s.module.snippetOf(parent)}\``
		}
	}
	if (!method || !(method in pureMethods)) {
		return {
			node: parent,
			message: `is passed to \`${s.module.snippetOf(end)}\``
		}
	}
	return escapeOfCallbacks(parent, s) ?? escapeOfValue(parent, s)
}

const escapeOfArgument = (
	call: CallExpression,
	argument: Node,
	s: EscapeState
): Escape | undefined => {
	if (s.graph.isArkExpression(call.callee, s.module)) return
	const builtin = globalPathOf(call.callee, s.module)
	if (builtin !== undefined) {
		if (builtin in writingFunctions && call.arguments[0] === argument) {
			return {
				node: call,
				message: `is written by \`${s.module.snippetOf(call)}\``
			}
		}
		if (builtin in pureFunctions)
			return escapeOfCallbacks(call, s) ?? escapeOfValue(call, s)
	}
	const helper = s.graph.helperOf(call.callee, s.module)
	if (helper && helper[1] === s.module) {
		const index = call.arguments.indexOf(argument as never)
		const params = helper[0].params
		const param =
			params[index] ?? params.find(param => param.type === "RestElement")
		if (param && argument.type !== "SpreadElement") {
			return (
				escapeOfPattern(
					param.type === "RestElement" ? param.argument : param,
					s
				) ?? escapeOfReturn(helper[0], s)
			)
		}
	}
	return {
		node: call,
		message: `is passed to \`${s.module.snippetOf(call.callee)}\``
	}
}

// functions passed alongside an object to a pure built-in receive its parts
const escapeOfCallbacks = (
	call: CallExpression,
	s: EscapeState
): Escape | undefined => {
	for (const arg of call.arguments) {
		if (!isFunctionNode(arg)) continue
		for (const param of arg.params) {
			const escape = escapeOfPattern(
				param.type === "RestElement" ? param.argument : param,
				s
			)
			if (escape) return escape
		}
	}
}

const escapeOfReturn = (
	fn: FunctionNode | undefined,
	s: EscapeState
): Escape | undefined => {
	if (!fn || s.seen.has(fn)) return
	s.seen.add(fn)
	const binding =
		fn.type === "FunctionDeclaration" && fn.id ?
			s.module.scopes.bindingsById.get(fn.id)
		: fn.parent?.type === "VariableDeclarator" && fn.parent.init === fn ?
			s.module.scopes.bindingsById.get(fn.parent.id)
		:	undefined
	if (!binding || binding.exportNames.length || binding.writes.length)
		return { node: fn, message: "is returned from a function" }
	for (const reference of binding.references) {
		const call = reference.id.parent
		if (call?.type !== "CallExpression" || call.callee !== reference.id) {
			return {
				node: reference.id,
				message: `is returned from \`${binding.name}\`, which is used as a value`
			}
		}
		const escape = escapeOfValue(call, s)
		if (escape) return escape
	}
}

const escapeOfPattern = (pattern: Node, s: EscapeState): Escape | undefined => {
	switch (pattern.type) {
		case "Identifier": {
			const binding = s.module.scopes.bindingsById.get(pattern)
			return binding && escapeOfBinding(binding, s)
		}
		case "AssignmentPattern":
			return escapeOfPattern(pattern.left, s)
		case "RestElement":
			return escapeOfPattern(pattern.argument, s)
		case "TSParameterProperty":
			return escapeOfPattern(pattern.parameter, s)
		case "ObjectPattern":
			for (const property of pattern.properties) {
				const escape = escapeOfPattern(
					property.type === "RestElement" ? property : property.value,
					s
				)
				if (escape) return escape
			}
			return
		case "ArrayPattern":
			for (const element of pattern.elements) {
				const escape = element && escapeOfPattern(element, s)
				if (escape) return escape
			}
			return
	}
	return {
		node: pattern,
		message: `is stored by \`${s.module.snippetOf(pattern)}\``
	}
}

const isWriteTarget = (node: Node): boolean => {
	const parent = node.parent!
	switch (parent.type) {
		case "AssignmentExpression":
			return parent.left === node
		case "UpdateExpression":
			return true
		case "UnaryExpression":
			return parent.operator === "delete"
		case "ForInStatement":
		case "ForOfStatement":
			return parent.left === node
		case "ArrayPattern":
		case "ObjectPattern":
		case "RestElement":
		case "TSAsExpression":
		case "TSSatisfiesExpression":
		case "TSNonNullExpression":
		case "TSTypeAssertion":
			return isWriteTarget(parent)
		case "Property":
		case "AssignmentPattern":
			return (
				(parent.type === "Property" ?
					parent.value === node
				:	parent.left === node) && isWriteTarget(parent)
			)
	}
	return false
}

const enclosingFunctionOf = (node: Node): FunctionNode | undefined => {
	for (let parent = node.parent; parent; parent = parent.parent)
		if (isFunctionNode(parent)) return parent
}

// e.g. `Object.keys` when `Object` is not shadowed
const globalPathOf = (
	callee: Node,
	module: SourceModule
): string | undefined => {
	let root = callee
	while (root.type === "MemberExpression" && !root.computed) root = root.object
	return (
			root.type === "Identifier" &&
				!module.scopes.referencesById.get(root)?.binding
		) ?
			module.textOf(callee)
		:	undefined
}

const pureFunctions: Record<string, 1> = Object.setPrototypeOf(
	{
		"Object.keys": 1,
		"Object.values": 1,
		"Object.entries": 1,
		"Object.fromEntries": 1,
		"Object.freeze": 1,
		"Object.isFrozen": 1,
		"Object.getOwnPropertyNames": 1,
		"Object.hasOwn": 1,
		"Object.assign": 1,
		"Array.isArray": 1,
		"Array.from": 1,
		"Array.of": 1,
		"JSON.stringify": 1,
		String: 1,
		Number: 1,
		Boolean: 1
	},
	null
)

const writingFunctions: Record<string, 1> = Object.setPrototypeOf(
	{
		"Object.assign": 1,
		"Object.defineProperty": 1,
		"Object.defineProperties": 1,
		"Object.setPrototypeOf": 1,
		"Reflect.set": 1,
		"Reflect.defineProperty": 1,
		"Reflect.deleteProperty": 1,
		"Reflect.setPrototypeOf": 1
	},
	null
)

const mutatingMethods: Record<string, 1> = Object.setPrototypeOf(
	{
		push: 1,
		pop: 1,
		shift: 1,
		unshift: 1,
		splice: 1,
		sort: 1,
		reverse: 1,
		fill: 1,
		copyWithin: 1
	},
	null
)

const pureMethods: Record<string, 1> = Object.setPrototypeOf(
	{
		at: 1,
		concat: 1,
		every: 1,
		filter: 1,
		find: 1,
		findIndex: 1,
		findLast: 1,
		findLastIndex: 1,
		flat: 1,
		flatMap: 1,
		forEach: 1,
		includes: 1,
		indexOf: 1,
		join: 1,
		lastIndexOf: 1,
		map: 1,
		reduce: 1,
		reduceRight: 1,
		slice: 1,
		some: 1,
		toReversed: 1,
		toSorted: 1,
		toSpliced: 1,
		with: 1,
		toString: 1,
		valueOf: 1,
		hasOwnProperty: 1,
		propertyIsEnumerable: 1
	},
	null
)
