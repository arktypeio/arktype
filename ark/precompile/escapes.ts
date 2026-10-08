import { hasArkKind } from "@ark/schema"
import { hasDomain } from "@ark/util"
import type { CallExpression, MemberExpression, Node } from "oxc-parser"
import {
	globalsByName,
	isPlainContainer,
	methodsByReceiverKind,
	pureBuiltins,
	type PureBuiltin
} from "./builtins.ts"
import {
	bindingOfFunction,
	enclosingFunctionOf,
	functionOfBinding,
	isFunctionNode,
	readsImplicitParams,
	type FunctionNode,
	type ModuleGraph
} from "./graph.ts"
import type { SourceModule } from "./module.ts"
import { isTransparent, unwrapExpression, type Binding } from "./scope.ts"

export interface Escape {
	node: Node
	message: string
}

interface EscapeState {
	module: SourceModule
	graph: ModuleGraph
	seen: Set<Node | Binding>
	// the object holds only primitives, arrays and plain objects, so converting or iterating it runs no code of its own
	isData: boolean
	// the object is a Module, whose members are arktype values with arktype's own methods
	isModule: boolean
}

export const findEscape = (
	binding: Binding,
	module: SourceModule,
	graph: ModuleGraph,
	value: unknown
): Escape | undefined =>
	escapeOfBinding(binding, {
		module,
		graph,
		seen: new Set(),
		isData: isData(value),
		isModule: hasArkKind(value, "module")
	})

const isData = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (!hasDomain(value, "object")) return true
	if (!isPlainContainer(value)) return false
	if (seen.has(value)) return true
	seen.add(value)
	return Reflect.ownKeys(value).every(k => isData(Reflect.get(value, k), seen))
}

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
	if (isTransparent(parent)) return escapeOfValue(parent, s)
	switch (parent.type) {
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
			return parent.object === node ?
					escapeOfMember(parent, s)
				:	escapeOfConversion(parent, s)
		case "Property":
			return parent.value === node ?
					escapeOfValue(parent.parent!, s)
				:	escapeOfConversion(parent, s)
		case "SpreadElement": {
			const container = parent.parent!
			return (
				container.type === "CallExpression" ?
					escapeOfArgument(container, parent, s)
				: container.type === "ArrayExpression" ?
					(escapeOfConversion(parent, s) ?? escapeOfValue(container, s))
				:	escapeOfValue(container, s)
			)
		}
		case "CallExpression":
			return parent.callee === node ?
					undefined
				:	escapeOfArgument(parent, node, s)
		case "VariableDeclarator":
			return parent.init === node ? escapeOfPattern(parent.id, s) : undefined
		case "AssignmentExpression":
			if (parent.left === node) return
			if (!["=", "||=", "&&=", "??="].includes(parent.operator))
				return escapeOfConversion(parent, s)
			if (parent.left.type === "Identifier") {
				const binding = s.module.scopes.referencesById.get(parent.left)?.binding
				return binding ?
						(escapeOfBinding(binding, s) ?? escapeOfValue(parent, s))
					:	{ node: parent, message: "is stored in a global" }
			}
			return {
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
			return parent.parent?.type === "TaggedTemplateExpression" ?
					{
						node: parent.parent,
						message: `is passed to \`${s.module.snippetOf(parent.parent.tag)}\``
					}
				:	escapeOfConversion(parent, s)
		case "BinaryExpression":
			if (
				parent.operator === "===" ||
				parent.operator === "!==" ||
				(parent.operator === "in" && parent.right === node)
			)
				return
			return parent.operator === "instanceof" && parent.left === node ?
					{
						node: parent,
						message: `is passed to \`${s.module.snippetOf(parent.right)}\``
					}
				:	escapeOfConversion(parent, s)
		case "UnaryExpression":
			return (
					parent.operator === "typeof" ||
						parent.operator === "void" ||
						parent.operator === "!"
				) ?
					undefined
				:	escapeOfConversion(parent, s)
		case "ForOfStatement":
			return (
				escapeOfConversion(parent, s) ??
				(parent.left.type === "VariableDeclaration" ?
					escapeOfPattern(parent.left.declarations[0].id, s)
				:	{
						node: parent.left,
						message: `is stored by \`${s.module.snippetOf(parent.left)}\``
					})
			)
		case "ExpressionStatement":
		case "IfStatement":
		case "WhileStatement":
		case "DoWhileStatement":
		case "ForStatement":
		case "ForInStatement":
		case "SwitchStatement":
		case "SwitchCase":
			return
	}
	return {
		node: parent,
		message: `is used by \`${s.module.snippetOf(parent)}\``
	}
}

// converting an object to a primitive or iterating it calls its methods, unless it holds only data
const escapeOfConversion = (node: Node, s: EscapeState): Escape | undefined =>
	s.isData ? undefined : (
		{
			node,
			message: `is passed to its own methods by \`${s.module.snippetOf(node)}\``
		}
	)

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
	if (parent.type !== "CallExpression" || parent.callee !== end)
		return escapeOfValue(end, s)
	// a method of a Module's member is arktype's, unless a write found elsewhere replaced it
	if (s.isModule) return
	const method =
		(end as MemberExpression).computed ?
			undefined
		:	((end as MemberExpression).property as { name: string }).name
	// in an object of data, a method by one of these names is a pure built-in or throws
	if (!s.isData || !method || !(method in pureMethods)) {
		return {
			node: parent,
			message: `is passed to \`${s.module.snippetOf(end)}\``
		}
	}
	return (
		escapeOfCallbacks(parent, pureBuiltins.get(pureMethods[method])!, s) ??
		escapeOfValue(parent, s)
	)
}

const escapeOfArgument = (
	call: CallExpression,
	argument: Node,
	s: EscapeState
): Escape | undefined => {
	if (s.graph.isArkExpression(call.callee, s.module)) return
	const builtin = builtinOf(call.callee, s.module)
	if (builtin) {
		if (builtin.writes && call.arguments[0] === argument) {
			return {
				node: call,
				message: `is written by \`${s.module.snippetOf(call)}\``
			}
		}
		if (!builtin.readsOnly && !s.isData) {
			return {
				node: call,
				message: `is passed to its own methods by \`${s.module.snippetOf(call)}\``
			}
		}
		return (
			escapeOfCallbacks(call, builtin, s, argument) ?? escapeOfValue(call, s)
		)
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

// functions passed alongside an object to a pure built-in receive its parts, and what they return is the call's result
const escapeOfCallbacks = (
	call: CallExpression,
	builtin: PureBuiltin,
	s: EscapeState,
	object?: Node
): Escape | undefined => {
	if (!builtin.calls) return
	s.seen.add(call)
	for (const arg of call.arguments) {
		if (arg === object || isUncallable(arg, s.module)) continue
		const callback = callbackOf(arg, s.module)
		if (!callback || readsImplicitParams(callback)) {
			return {
				node: call,
				message: `is passed to \`${s.module.snippetOf(arg)}\``
			}
		}
		for (const param of callback.params) {
			const escape = escapeOfPattern(
				param.type === "RestElement" ? param.argument : param,
				s
			)
			if (escape) return escape
		}
	}
}

const callbackOf = (
	node: Node,
	module: SourceModule
): FunctionNode | undefined => {
	node = unwrapExpression(node)
	if (isFunctionNode(node)) return node
	const binding =
		node.type === "Identifier" ?
			module.scopes.referencesById.get(node)?.binding
		:	undefined
	return binding && functionOfBinding(binding)
}

// a primitive or a literal object, which a built-in does not call
const isUncallable = (node: Node, module: SourceModule): boolean => {
	node = unwrapExpression(node)
	return node.type === "Identifier" ?
			node.name === "undefined" &&
				!module.scopes.referencesById.get(node)?.binding
		:	uncallableTypes.has(node.type)
}

const uncallableTypes = new Set<string>([
	"Literal",
	"TemplateLiteral",
	"UnaryExpression",
	"BinaryExpression",
	"ArrayExpression",
	"ObjectExpression"
])

const escapeOfReturn = (
	fn: FunctionNode | undefined,
	s: EscapeState
): Escape | undefined => {
	if (!fn || s.seen.has(fn) || s.seen.has(fn.parent!)) return
	s.seen.add(fn)
	const binding = bindingOfFunction(fn, s.module)
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
	if (isTransparent(parent)) return isWriteTarget(parent)
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

// e.g. `Object.keys` when `Object` is not shadowed
const builtinOf = (
	callee: Node,
	module: SourceModule
): PureBuiltin | undefined => {
	if (callee.type === "Identifier") {
		return module.scopes.referencesById.get(callee)?.binding ?
				undefined
			:	pureBuiltins.get(globalsByName[callee.name] as Function)
	}
	if (
		callee.type !== "MemberExpression" ||
		callee.computed ||
		callee.object.type !== "Identifier" ||
		module.scopes.referencesById.get(callee.object)?.binding
	)
		return
	const owner = globalsByName[callee.object.name]
	return owner === undefined ? undefined : (
			pureBuiltins.get(
				Object.getOwnPropertyDescriptor(owner, callee.property.name)
					?.value as Function
			)
		)
}

const pureMethods: Record<string, Function> = Object.assign(
	Object.create(null),
	...Object.values(methodsByReceiverKind)
)
