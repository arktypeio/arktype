import { hasArkKind } from "@ark/schema"
import { Callable, hasDomain, type KeySet } from "@ark/util"
import { InternalTypeParser } from "arktype/internal/type.ts"
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
	typeFactoryMethods,
	type FunctionNode,
	type ModuleGraph
} from "./graph.ts"
import type { SourceModule } from "./module.ts"
import {
	isTransparent,
	runtimeParamsOf,
	unwrapExpression,
	type Binding
} from "./scope.ts"

export interface Escape {
	node: Node
	message: string
}

// what arktype does with a call's arguments: parses each, parses them as one tuple expression, returns one, or validates them
export type ArkCall = "parse" | "parseTuple" | "identity" | "validate"

interface EscapeState {
	module: SourceModule
	graph: ModuleGraph
	binding: Binding
	value: unknown
	arkCallOf: (call: CallExpression) => ArkCall | undefined
	seen: Set<Node | Binding>
	// the object holds only primitives, arrays and plain objects, so converting or reading it runs no code of its own
	isData: boolean
	// arktype keeps part of the object wherever it parses it
	holdsKept: boolean
}

// an object stays proven only through property reads, static helpers, arktype definitions and the literals passed to them
export const findEscape = (
	binding: Binding,
	module: SourceModule,
	graph: ModuleGraph,
	value: unknown,
	arkCallOf: (call: CallExpression) => ArkCall | undefined
): Escape | undefined =>
	escapeOfBinding(binding, {
		module,
		graph,
		binding,
		value,
		arkCallOf,
		seen: new Set(),
		isData: isData(value),
		holdsKept: holdsKeptDefinition(value)
	})

const isData = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (!hasDomain(value, "object")) return true
	if (!isPlainContainer(value)) return false
	if (seen.has(value)) return true
	seen.add(value)
	return Reflect.ownKeys(value).every(k => isData(Reflect.get(value, k), seen))
}

// e.g. `["===", {}]`, whose unit arktype keeps, or a Standard Schema, which it wraps
const holdsKeptDefinition = (
	value: unknown,
	seen = new Set<unknown>()
): boolean => {
	if (!isPlainContainer(value) || seen.has(value)) return false
	seen.add(value)
	if (
		Array.isArray(value) ?
			value.includes("===") || value.includes("@")
		:	"~standard" in value
	)
		return true
	return Reflect.ownKeys(value).some(k =>
		holdsKeptDefinition(Reflect.get(value, k), seen)
	)
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
		const escape =
			reference.isWrite ?
				escapeOfWrite(reference.id, s)
			:	escapeOfValue(reference.id, s)
		if (escape) return escape
	}
}

// a logical assignment yields the old value unless it assigns, and a compound one converts it
const escapeOfWrite = (id: Node, s: EscapeState): Escape | undefined => {
	let target = id
	while (isTransparent(target.parent!)) target = target.parent!
	const parent = target.parent!
	if (parent.type === "UpdateExpression") return escapeOfConversion(parent, s)
	if (
		parent.type !== "AssignmentExpression" ||
		parent.left !== target ||
		parent.operator === "="
	)
		return
	return ["||=", "&&=", "??="].includes(parent.operator) ?
			escapeOfValue(parent, s)
		:	escapeOfConversion(parent, s)
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
			return escapeOfLiteral(parent, s)
		case "ArrayExpression":
			return escapeOfLiteral(node, s)
		case "SpreadElement":
			return parent.parent?.type === "CallExpression" ?
					escapeOfArgument(parent.parent, parent, s)
				:	escapeOfLiteral(parent, s)
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
			return escapeOfStore(parent, s)
		case "AssignmentExpression":
			return ["=", "||=", "&&=", "??="].includes(parent.operator) ?
					escapeOfStore(parent, s)
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

const escapeOfStore = (node: Node, s: EscapeState): Escape => ({
	node,
	message: `is stored by \`${s.module.snippetOf(node)}\``
})

// e.g. `{ a: o }` in `type({ a: o })`, which is an argument of the call, unless arktype keeps the part of it holding the object
const escapeOfLiteral = (start: Node, s: EscapeState): Escape | undefined => {
	let isKept = false
	let child = start
	for (let parent = child.parent!; ; parent = child.parent!) {
		if (parent.type === "CallExpression" && parent.callee !== child) {
			const arkCall = s.arkCallOf(parent)
			return arkCall ?
					escapeOfArkArgument(parent, child, arkCall, isKept, s)
				:	escapeOfStore(start, s)
		}
		if (parent.type === "ArrayExpression")
			isKept ||= keepsElement(parent.elements, child, s)
		else if (
			!isTransparent(parent) &&
			parent.type !== "ObjectExpression" &&
			parent.type !== "SpreadElement" &&
			!(parent.type === "Property" && parent.value === child)
		)
			return escapeOfStore(start, s)
		child = parent
	}
}

const escapeOfArkArgument = (
	call: CallExpression,
	argument: Node,
	arkCall: ArkCall,
	isKept: boolean,
	s: EscapeState
): Escape | undefined => {
	if (arkCall === "identity") return escapeOfValue(call, s)
	if (arkCall === "validate") return escapeOfPassing(call, call.callee, s)
	if (
		isKept ||
		s.holdsKept ||
		(arkCall === "parseTuple" && keepsArgument(call.arguments, argument, s))
	) {
		return {
			node: call,
			message: `is kept by \`${s.module.snippetOf(call.callee)}\``
		}
	}
}

// in a tuple expression, `===` keeps the elements after it and `@` keeps the meta object after it
const keepsElement = (
	elements: readonly (Node | null)[],
	child: Node,
	s: EscapeState
): boolean => {
	const i = elements.indexOf(child)
	return (
		elements.slice(0, i).some(element => element?.type === "SpreadElement") ||
		(i >= 1 && mayBe(elements[0], operator => operator === "===", s)) ||
		(i >= 2 && mayBe(elements[1], operator => operator === "@", s))
	)
}

// `type("<t>", def)` keeps `def` as a generic's body
const keepsArgument = (
	args: readonly Node[],
	argument: Node,
	s: EscapeState
): boolean =>
	keepsElement(args, argument, s) ||
	(args.length === 2 &&
		args[1] === argument &&
		mayBe(args[0], params => params.startsWith("<") && params.endsWith(">"), s))

// whether an element of a tuple can evaluate to a string the predicate accepts
const mayBe = (
	node: Node | null,
	accepts: (value: string) => boolean,
	s: EscapeState
): boolean => {
	if (!node || node.type in nonStringKinds) return false
	const known =
		node.type === "Literal" ? { value: node.value } : valueAlong(node, s)
	return !known || (typeof known.value === "string" && accepts(known.value))
}

// the value at a chain of reads from the object, e.g. `o.a.b`, which the build knows without evaluating anything
const valueAlong = (
	node: Node,
	s: EscapeState
): { value: unknown } | undefined => {
	const keys = keysFromObject(node, s)
	if (!keys) return
	let value = s.value
	for (const key of keys) {
		if (!isPlainContainer(value)) return
		value = Reflect.get(value, key)
	}
	return { value }
}

// e.g. `["a", "b"]` for `o.a.b`
const keysFromObject = (node: Node, s: EscapeState): string[] | undefined => {
	const keys: string[] = []
	let object = unwrapExpression(node)
	while (object.type === "MemberExpression") {
		if (object.computed) return
		keys.unshift(object.property.name)
		object = unwrapExpression(object.object)
	}
	return (
			object.type === "Identifier" &&
				s.module.scopes.referencesById.get(object)?.binding === s.binding
		) ?
			keys
		:	undefined
}

const nonStringKinds = {
	ObjectExpression: 1,
	ArrayExpression: 1,
	ArrowFunctionExpression: 1,
	FunctionExpression: 1,
	ClassExpression: 1
} as const satisfies KeySet

const escapeOfPassing = (
	call: CallExpression,
	callee: Node,
	s: EscapeState
): Escape => ({
	node: call,
	message: `is passed to \`${s.module.snippetOf(callee)}\``
})

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
	// `as`, `!` and optional chaining around a chain leave a call's `this` the same
	let end: MemberExpression = member
	let outer: Node = member
	for (let parent = member.parent!; ; parent = outer.parent!) {
		if (parent.type === "MemberExpression" && parent.object === outer)
			end = parent
		else if (!isTransparent(parent) && parent.type !== "ChainExpression") break
		outer = parent
	}
	if (isWriteTarget(outer)) {
		const write = outer.parent!
		return {
			node: write,
			message: `is written by \`${s.module.snippetOf(write)}\``
		}
	}
	const parent = outer.parent!
	if (parent.type !== "CallExpression" || parent.callee !== outer)
		return escapeOfValue(outer, s)
	const receiver = arkReceiverOf(end, s)
	if (receiver) return escapeOfArkResult(parent, end, receiver, s)
	return s.isData ?
			escapeOfDataMethod(end, parent, s)
		:	escapeOfPassing(parent, end, s)
}

// a method on plain data is an array's pure built-in or a primitive's, but `valueOf` and the rest of Object.prototype's can return the object
const escapeOfDataMethod = (
	end: MemberExpression,
	call: CallExpression,
	s: EscapeState
): Escape | undefined => {
	const name = end.computed ? undefined : end.property.name
	if (name && !(name in Object.prototype)) {
		const method = methodsByReceiverKind.array[name]
		if (method) {
			return escapeOfPureCall(
				call,
				pureBuiltins.get(method)!,
				call.arguments.length,
				s
			)
		}
		// a primitive's method sees only the primitive, and an object of data has none
		if (!(name in Array.prototype) && isPrimitiveMethod(name)) return
	}
	return escapeOfPassing(call, end, s)
}

const isPrimitiveMethod = (name: string) =>
	name in String.prototype ||
	name in Number.prototype ||
	name in Boolean.prototype ||
	name in BigInt.prototype

// a parse returns a Type, a validation the data's result and `define` its argument, but another method may return the receiver's parts, like `$.export()` its submodules
const escapeOfArkResult = (
	call: CallExpression,
	end: MemberExpression,
	receiver: unknown,
	s: EscapeState
): Escape | undefined =>
	(
		s.arkCallOf(call) ||
		// a Type's methods return new values
		hasArkKind(receiver, "root") ||
		((receiver instanceof InternalTypeParser ||
			hasArkKind(receiver, "scope")) &&
			!end.computed &&
			end.property.name in typeFactoryMethods)
	) ?
		undefined
	:	escapeOfValue(call, s)

// e.g. `$.user` for `$.user.array()` on a Module `$` or `$.type` for `$.type.Record()` on a Scope, unless a write the analysis finds replaced the method
const arkReceiverOf = (
	end: MemberExpression,
	s: EscapeState
): object | undefined => {
	if (!hasArkKind(s.value, "module") && !hasArkKind(s.value, "scope")) return
	const keys = keysFromObject(end, s)
	if (!keys || keys.includes("constructor")) return
	let receiver: unknown
	let value = s.value
	for (const key of keys) {
		if (!isArkValue(value) && !(value instanceof Callable)) return
		receiver = value
		value = Reflect.get(value as object, key)
	}
	return typeof value === "function" && !intrinsics.has(value) ?
			(receiver as object)
		:	undefined
}

const escapeOfArgument = (
	call: CallExpression,
	argument: Node,
	s: EscapeState
): Escape | undefined => {
	const arkCall = s.arkCallOf(call)
	if (arkCall) return escapeOfArkArgument(call, argument, arkCall, false, s)
	const builtin = builtinOf(call.callee, s.module)
	if (builtin?.writes) {
		return call.arguments[0] === argument ?
				{ node: call, message: `is written by \`${s.module.snippetOf(call)}\`` }
			:	escapeOfStore(call, s)
	}
	if (builtin && s.isData)
		return escapeOfPureCall(call, builtin, call.arguments.length - 1, s)
	const helper = s.graph.helperOf(call.callee, s.module)
	if (helper && helper[1] === s.module) {
		const param = paramOf(helper[0], call, argument)
		if (param) return escapeOfPattern(param, s) ?? escapeOfReturn(helper[0], s)
	}
	return escapeOfPassing(call, call.callee, s)
}

// the parameter an argument binds, unless a spread before it hides its position
const paramOf = (
	fn: FunctionNode,
	call: CallExpression,
	argument: Node
): Node | undefined => {
	const params = runtimeParamsOf(fn)
	for (let i = 0; i < call.arguments.length; i++) {
		const arg = call.arguments[i]
		if (arg.type === "SpreadElement") return
		if (arg === argument) {
			const param =
				params[i] ?? params.find(param => param.type === "RestElement")
			return param?.type === "RestElement" ? param.argument : param
		}
	}
}

// on plain data a pure built-in runs no code unless it calls a function passed with it, and its result may hold the data's parts
const escapeOfPureCall = (
	call: CallExpression,
	builtin: PureBuiltin,
	otherArguments: number,
	s: EscapeState
): Escape | undefined =>
	builtin.calls && otherArguments ? escapeOfPassing(call, call.callee, s)
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
	return escapeOfStore(pattern, s)
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
