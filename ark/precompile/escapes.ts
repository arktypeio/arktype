import { hasArkKind } from "@ark/schema"
import { hasDomain } from "@ark/util"
import type { CallExpression, MemberExpression, Node } from "oxc-parser"
import {
	globalsByName,
	intrinsics,
	isArkValue,
	isPlainContainer,
	methodsByReceiverKind,
	pureBuiltins,
	type PureBuiltin
} from "./builtins.ts"
import {
	bindingOfFunction,
	enclosingFunctionOf,
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
	binding: Binding
	value: unknown
	isDefinitionCall: (call: CallExpression) => boolean
	seen: Set<Node | Binding>
	// the object holds only primitives, arrays and plain objects, so converting or reading it runs no code of its own
	isData: boolean
}

// R1: an object stays proven only through property reads, static helpers, arktype definitions and definition positions
export const findEscape = (
	binding: Binding,
	module: SourceModule,
	graph: ModuleGraph,
	value: unknown,
	isDefinitionCall: (call: CallExpression) => boolean
): Escape | undefined =>
	escapeOfBinding(binding, {
		module,
		graph,
		binding,
		value,
		isDefinitionCall,
		seen: new Set(),
		isData: isData(value)
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
			if (parent.value !== node) return escapeOfConversion(parent, s)
			return isDefinitionPosition(parent, s) ? undefined : stored(parent, s)
		case "ArrayExpression":
			return isDefinitionPosition(parent, s) ? undefined : stored(parent, s)
		case "SpreadElement":
			return (
				parent.parent?.type === "CallExpression" ?
					escapeOfArgument(parent.parent, parent, s)
				: isDefinitionPosition(parent, s) ? undefined
				: stored(parent, s)
			)
		case "CallExpression":
			return parent.callee === node ?
					undefined
				:	escapeOfArgument(parent, node, s)
		case "ReturnStatement":
			return escapeOfReturn(enclosingFunctionOf(parent), s)
		case "ArrowFunctionExpression":
			return parent.body === node ? escapeOfReturn(parent, s) : undefined
		case "VariableDeclarator":
		case "ForOfStatement":
			return stored(parent, s)
		case "AssignmentExpression":
			return ["=", "||=", "&&=", "??="].includes(parent.operator) ?
					stored(parent, s)
				:	escapeOfConversion(parent, s)
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

const stored = (node: Node, s: EscapeState): Escape => ({
	node,
	message: `is stored by \`${s.module.snippetOf(node)}\``
})

// e.g. `{ a: o }` in `type({ a: o })`, which arktype reads as definition data
const isDefinitionPosition = (container: Node, s: EscapeState): boolean => {
	let node = container
	for (let parent = node.parent; parent; parent = node.parent) {
		if (parent.type === "CallExpression")
			return parent.callee !== node && s.isDefinitionCall(parent)
		if (
			!isTransparent(parent) &&
			parent.type !== "ObjectExpression" &&
			parent.type !== "ArrayExpression" &&
			parent.type !== "SpreadElement" &&
			!(parent.type === "Property" && parent.value === node)
		)
			return false
		node = parent
	}
	return false
}

// converting an object to a primitive calls its methods, unless it holds only data
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
	let end: MemberExpression = member
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
	if (isArkMethodCall(end, s)) return
	const method = end.computed ? undefined : end.property.name
	// in an object of data, a method by one of these names is a pure built-in or throws
	const builtin =
		s.isData && method && method in pureMethods ?
			pureBuiltins.get(pureMethods[method])
		:	undefined
	return builtin ?
			escapeOfPureCall(parent, builtin, parent.arguments.length, s)
		:	{ node: parent, message: `is passed to \`${s.module.snippetOf(end)}\`` }
}

// e.g. `$.user.array()` on a Module `$`: a method its members reach is arktype's, unless a write the analysis finds replaced it
const isArkMethodCall = (end: MemberExpression, s: EscapeState): boolean => {
	if (!hasArkKind(s.value, "module")) return false
	const keys: string[] = []
	let node: Node = end
	while (node.type === "MemberExpression") {
		if (node.computed || node.property.name === "constructor") return false
		keys.unshift(node.property.name)
		node = unwrapExpression(node.object)
	}
	if (
		node.type !== "Identifier" ||
		s.module.scopes.referencesById.get(node)?.binding !== s.binding
	)
		return false
	let value = s.value
	for (const key of keys) {
		if (!isArkValue(value)) return false
		value = Reflect.get(value as object, key)
	}
	return typeof value === "function" && !intrinsics.has(value)
}

const escapeOfArgument = (
	call: CallExpression,
	argument: Node,
	s: EscapeState
): Escape | undefined => {
	if (s.isDefinitionCall(call)) return
	const builtin = builtinOf(call.callee, s.module)
	if (builtin?.writes) {
		return call.arguments[0] === argument ?
				{ node: call, message: `is written by \`${s.module.snippetOf(call)}\`` }
			:	stored(call, s)
	}
	if (builtin && s.isData)
		return escapeOfPureCall(call, builtin, call.arguments.length - 1, s)
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

// on plain data a pure built-in runs no code unless it calls a function passed with it, and its result may hold the data's parts
const escapeOfPureCall = (
	call: CallExpression,
	builtin: PureBuiltin,
	otherArguments: number,
	s: EscapeState
): Escape | undefined =>
	builtin.calls && otherArguments ?
		{
			node: call,
			message: `is passed to \`${s.module.snippetOf(call.callee)}\``
		}
	: builtin.freshResult ? undefined
	: escapeOfValue(call, s)

// only a static helper's calls are known, so what another function returns escapes
const escapeOfReturn = (
	fn: FunctionNode | undefined,
	s: EscapeState
): Escape | undefined => {
	if (!fn || s.seen.has(fn)) return
	s.seen.add(fn)
	const binding = bindingOfFunction(fn, s.module)
	if (
		!binding ||
		binding.exportNames.length ||
		s.graph.boundHelperOf(binding, s.module)?.[0] !== fn
	)
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
	return stored(pattern, s)
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
