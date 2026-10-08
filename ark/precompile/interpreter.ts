import { hasArkKind } from "@ark/schema"
import { ParseError } from "@ark/util"
import { InternalTypedFn } from "arktype/internal/fn.ts"
import { InternalChainedMatchParser } from "arktype/internal/match.ts"
import type {
	CallExpression,
	Class,
	IdentifierReference,
	MemberExpression,
	MethodDefinition,
	NewExpression,
	Node,
	ObjectExpression,
	TemplateLiteral
} from "oxc-parser"
import {
	globalsByName,
	intrinsics,
	methodsByReceiverKind,
	pureBuiltins,
	type MethodReceiverKind
} from "./builtins.ts"
import {
	DynamicValue,
	writeCalledAtDefinitionMessage,
	writeNotStaticHelperMessage,
	writeParameterMessage
} from "./dynamic.ts"
import { findEscape } from "./escapes.ts"
import {
	bindingOfFunction,
	contains,
	isFunctionNode,
	runtimeMembers,
	unstableArkMembers,
	staticBodyOf,
	unwrapExpression,
	type FunctionNode,
	type ModuleGraph
} from "./graph.ts"
import type { SourceModule } from "./module.ts"
import type { Binding } from "./scope.ts"

export interface InterpreterOptions {
	// values of bundler `define` constants, keyed by the expression they replace
	define?: Record<string, unknown> | undefined
}

export type InputRoot =
	| { kind: "export"; file: string; name: string }
	| { kind: "binding"; module: SourceModule; binding: Binding }
	| { kind: "define"; name: string }

export interface Read {
	root: InputRoot
	path: PropertyKey[]
	value: unknown
}

export interface Trace {
	reads: Read[]
	helpers: [FunctionNode, SourceModule][]
}

export interface Environment {
	valuesByBinding: Map<Binding, unknown>
	parent: Environment | undefined
}

export interface Closure {
	node: FunctionNode
	module: SourceModule
	env: Environment | undefined
	name: string
}

export interface StandIn {
	kind: "function" | "class" | "opaque"
	module: SourceModule
	node: Node
	closure: Closure | undefined
	dynamic: DynamicValue | undefined
	// the parameter count arktype reads as `length`, if a declaration gives it
	arity: number | undefined
	isCalled: boolean
	isDefinition: boolean
}

export interface SiteState {
	node: Node
	module: SourceModule
	trace: Trace
	sourcesByValue: Map<unknown, Node>
	holes: unknown[]
	// the functions the site interpreted
	interpreted: Set<Node>
	// each call into arktype's API
	requests: [Node, SourceModule][]
	value: unknown
	error: DynamicValue | ParseError | undefined
	isEvaluated: boolean
}

export const createSiteState = (
	node: Node,
	module: SourceModule
): SiteState => ({
	node,
	module,
	trace: { reads: [], helpers: [] },
	sourcesByValue: new Map(),
	holes: [],
	interpreted: new Set(),
	requests: [],
	value: undefined,
	error: undefined,
	isEvaluated: false
})

export interface Context {
	module: SourceModule
	env: Environment | undefined
	trace: Trace
	site: SiteState | undefined
	// the site or declaration being evaluated, which runs before bindings declared after it are initialized
	origin: { module: SourceModule; node: Node } | undefined
	depth: number
}

interface Reference {
	value: unknown
	read?: Read
}

interface Evaluated {
	value: unknown
	trace: Trace
	error?: unknown
}

class ModuleNamespace {
	module: SourceModule

	constructor(module: SourceModule) {
		this.module = module
	}
}

const shortCircuit = { shortCircuit: true }

const maxDepth = 64

export class Interpreter {
	graph: ModuleGraph
	opts: InterpreterOptions
	sitesByNode = new Map<Node, SiteState>()
	standIns = new WeakMap<object, StandIn>()
	// where each symbol was first evaluated
	symbolSources = new Map<symbol, [Node, SourceModule]>()
	private valuesByBinding = new Map<Binding, Evaluated | "evaluating">()
	private valuesByNode = new Map<Node, Evaluated>()
	private escapesByBinding = new Map<Binding, DynamicValue | null>()
	private opaqueByDynamic = new WeakMap<DynamicValue, object>()
	// validating functions read from arktype values, like `T.assert`
	private validators = new WeakSet<object>()
	// plain objects arktype returned, like `declare<t>()`, whose methods are arktype's
	private arkObjects = new WeakSet<object>()
	// the call into arktype or a built-in that a stand-in may be called from
	private active: { ctx: Context; isArktype: boolean } | undefined

	constructor(graph: ModuleGraph, opts: InterpreterOptions = {}) {
		this.graph = graph
		this.opts = opts
	}

	evaluateSite(site: SiteState): SiteState {
		if (site.isEvaluated) return site
		site.isEvaluated = true
		const ctx: Context = {
			module: site.module,
			env: undefined,
			trace: site.trace,
			site,
			origin: { module: site.module, node: site.node },
			depth: 0
		}
		try {
			site.value = this.evaluateNode(site.node, ctx)
		} catch (e) {
			site.error = this.thrown(e, site.node, ctx)
		}
		return site
	}

	evaluate(node: Node, ctx: Context): unknown {
		const site = ctx.env ? undefined : this.sitesByNode.get(node)
		// a definition nested in the site is part of it, so its holes and inputs are the site's
		if (
			site &&
			site !== ctx.site &&
			!(ctx.site?.module === site.module && contains(ctx.site.node, node))
		) {
			this.evaluateSite(site)
			if (site.error !== undefined) throw site.error
			return site.value
		}
		const value = this.evaluateNode(node, ctx)
		if (typeof value === "symbol" && !this.symbolSources.has(value))
			this.symbolSources.set(value, [node, ctx.module])
		if (
			ctx.site &&
			ctx.module === ctx.site.module &&
			contains(ctx.site.node, node) &&
			(typeof value === "symbol" ||
				value instanceof DynamicValue ||
				(isObjectLike(value) && this.standIns.has(value)))
		) {
			const previous = ctx.site.sourcesByValue.get(value)
			// a hole is the outermost expression that evaluates to it
			if (!previous || contains(node, previous))
				ctx.site.sourcesByValue.set(value, node)
		}
		return value
	}

	private evaluateNode(node: Node, ctx: Context): unknown {
		switch (node.type) {
			case "Literal":
				return (
					"regex" in node ? new RegExp(node.regex.pattern, node.regex.flags)
					: "bigint" in node ? BigInt(node.bigint)
					: node.value
				)
			case "TemplateLiteral":
				return this.evaluateTemplate(node, ctx)
			case "TaggedTemplateExpression": {
				const tag = this.evaluate(node.tag, ctx)
				if (tag !== String.raw) {
					return new DynamicValue(
						ctx.module,
						node,
						`${ctx.module.snippetOf(node)} uses a template tag other than \`String.raw\``
					)
				}
				const values: unknown[] = []
				for (const expression of node.quasi.expressions) {
					const value = this.evaluate(expression, ctx)
					if (isDynamic(value)) return value.asOperand()
					values.push(value)
				}
				const strings = Object.assign(
					node.quasi.quasis.map(quasi => quasi.value.cooked),
					{ raw: node.quasi.quasis.map(quasi => quasi.value.raw) }
				)
				return this.callBuiltin(
					String.raw,
					[strings, ...values],
					undefined,
					node,
					ctx
				)
			}
			case "Identifier":
			case "MemberExpression":
				return this.consume(this.evaluateReference(node, ctx), ctx)
			case "ChainExpression": {
				const value = this.evaluate(node.expression, ctx)
				return value === shortCircuit ? undefined : value
			}
			case "ParenthesizedExpression":
			case "TSAsExpression":
			case "TSSatisfiesExpression":
			case "TSTypeAssertion":
			case "TSNonNullExpression":
			case "TSInstantiationExpression":
				return this.evaluate(node.expression, ctx)
			case "ArrayExpression": {
				const result: unknown[] = []
				for (const element of node.elements) {
					if (!element) result.length++
					else if (element.type !== "SpreadElement") {
						const value = this.evaluate(element, ctx)
						if (isDynamic(value) && !value.isOpaque) return value
						result.push(value)
					} else {
						const items = this.spreadItemsOf(element, ctx)
						if (isDynamic(items)) return items
						result.push(...items)
					}
				}
				return result
			}
			case "ObjectExpression":
				return this.evaluateObject(node, ctx)
			case "UnaryExpression":
				return this.evaluateUnary(node, ctx)
			case "BinaryExpression":
				return this.evaluateBinary(node, ctx)
			case "LogicalExpression": {
				const left = this.evaluate(node.left, ctx)
				if (isDynamic(left)) return left
				const dynamic = findDynamic(left)
				if (dynamic) return dynamic.asOperand()
				const isLeft =
					node.operator === "&&" ? !left
					: node.operator === "||" ? !!left
					: left !== null && left !== undefined
				return isLeft ? left : this.evaluate(node.right, ctx)
			}
			case "ConditionalExpression": {
				const test = this.evaluate(node.test, ctx)
				const dynamic = findDynamic(test)
				if (dynamic) return dynamic.asOperand()
				return this.evaluate(test ? node.consequent : node.alternate, ctx)
			}
			case "SequenceExpression": {
				let value: unknown
				for (const expression of node.expressions) {
					value = this.evaluate(expression, ctx)
					const dynamic = findDynamic(value)
					if (dynamic) return dynamic.asOperand()
				}
				return value
			}
			case "CallExpression":
				return this.evaluateCall(node, ctx)
			case "NewExpression":
				return this.evaluateNew(node, ctx)
			case "ArrowFunctionExpression":
			case "FunctionExpression":
				return this.functionStandIn(
					{
						node,
						module: ctx.module,
						env: ctx.env,
						name: node.id?.name ?? inferredNameOf(node)
					},
					node
				)
			case "ClassExpression":
				return this.classStandIn(node, ctx)
		}
		return new DynamicValue(
			ctx.module,
			node,
			`${unsupportedDescriptions[node.type] ?? `\`${ctx.module.snippetOf(node)}\``} is not in the static subset`,
			undefined,
			"opaque"
		)
	}

	private spreadItemsOf(
		spread: Extract<Node, { type: "SpreadElement" }>,
		ctx: Context
	): unknown[] | DynamicValue {
		const value = this.evaluate(spread.argument, ctx)
		if (isDynamic(value)) return value
		return Array.isArray(value) || typeof value === "string" ?
				[...value]
			:	new DynamicValue(
					ctx.module,
					spread,
					`\`${ctx.module.snippetOf(spread)}\` spreads a value other than an array or string`
				)
	}

	private evaluateTemplate(node: TemplateLiteral, ctx: Context): unknown {
		let result = node.quasis[0].value.cooked!
		for (let i = 0; i < node.expressions.length; i++) {
			const value = this.evaluate(node.expressions[i], ctx)
			if (isDynamic(value)) return value.asOperand()
			if (isObjectLike(value)) return this.coercion(node.expressions[i], ctx)
			if (typeof value === "symbol") {
				return new DynamicValue(
					ctx.module,
					node.expressions[i],
					`\`${ctx.module.snippetOf(node.expressions[i])}\` converts a symbol to a string, which throws`
				)
			}
			result += String(value) + node.quasis[i + 1].value.cooked
		}
		return result
	}

	private evaluateObject(node: ObjectExpression, ctx: Context): unknown {
		const result: Record<PropertyKey, unknown> = {}
		for (const property of node.properties) {
			if (property.type === "SpreadElement") {
				const spread = this.evaluate(property.argument, ctx)
				if (isDynamic(spread)) return spread
				if (
					spread !== null &&
					spread !== undefined &&
					typeof spread !== "string" &&
					!isPlainContainer(spread) &&
					!hasArkKind(spread, "module")
				) {
					return new DynamicValue(
						ctx.module,
						property,
						`\`${ctx.module.snippetOf(property)}\` spreads a value other than an object literal or Module`
					)
				}
				const copy: object = { ...(spread as object) }
				for (const k of Reflect.ownKeys(copy))
					defineData(result, k, Reflect.get(copy, k))
				continue
			}
			if (property.kind !== "init") {
				return new DynamicValue(
					ctx.module,
					property,
					`\`${ctx.module.snippetOf(property)}\` is an accessor, which runs code when arktype reads the definition`
				)
			}
			const key =
				property.computed ? this.evaluate(property.key, ctx)
				: property.key.type === "Identifier" ? property.key.name
				: String((property.key as { value: unknown }).value)
			if (isDynamic(key)) return key
			if (isObjectLike(key)) return this.coercion(property.key, ctx)
			if (
				key === "__proto__" &&
				!property.computed &&
				!property.shorthand &&
				!property.method
			) {
				return new DynamicValue(
					ctx.module,
					property,
					"a `__proto__` key changes the object's prototype"
				)
			}
			const overwritten = result[key as PropertyKey]
			if (isDynamic(overwritten)) {
				return new DynamicValue(
					ctx.module,
					property,
					`\`${ctx.module.snippetOf(property)}\` overwrites a value the build does not know`,
					overwritten.asOperand()
				)
			}
			const value = this.evaluate(property.value, ctx)
			if (isDynamic(value) && !value.isOpaque) return value
			defineData(result, key as PropertyKey, value)
		}
		return result
	}

	private evaluateUnary(
		node: Extract<Node, { type: "UnaryExpression" }>,
		ctx: Context
	): unknown {
		if (node.operator === "delete") {
			return new DynamicValue(
				ctx.module,
				node,
				"`delete` is not in the static subset"
			)
		}
		const argument = this.evaluate(node.argument, ctx)
		const dynamic = findDynamic(argument)
		if (dynamic) return dynamic.asOperand()
		switch (node.operator) {
			case "typeof":
				return typeof argument
			case "void":
				return undefined
			case "!":
				return !argument
		}
		if (isObjectLike(argument)) return this.coercion(node, ctx)
		try {
			return unaryOperators[node.operator](argument)
		} catch (e) {
			throw this.thrown(e, node, ctx)
		}
	}

	private evaluateBinary(
		node: Extract<Node, { type: "BinaryExpression" }>,
		ctx: Context
	): unknown {
		if (node.left.type === "PrivateIdentifier") {
			return new DynamicValue(
				ctx.module,
				node,
				"a private `in` check is not in the static subset"
			)
		}
		const left = this.evaluate(node.left, ctx)
		const right = this.evaluate(node.right, ctx)
		const dynamic = findDynamic(left) ?? findDynamic(right)
		if (dynamic) return dynamic.asOperand()
		switch (node.operator) {
			case "===":
				return left === right
			case "!==":
				return left !== right
			case "instanceof":
				return new DynamicValue(
					ctx.module,
					node,
					"`instanceof` is not in the static subset"
				)
			case "in":
				if (!isPlainContainer(right)) {
					return new DynamicValue(
						ctx.module,
						node,
						`\`${ctx.module.snippetOf(node)}\` checks a key of a value other than an object literal`
					)
				}
				if (isObjectLike(left)) return this.coercion(node.left, ctx)
				return (left as PropertyKey) in right
		}
		if (isObjectLike(left) || isObjectLike(right))
			return this.coercion(node, ctx)
		let result: unknown
		try {
			result = binaryOperators[node.operator](left, right)
		} catch (e) {
			throw this.thrown(e, node, ctx)
		}
		return (
				node.operator === "**" &&
					!(
						Number.isInteger(left) &&
						Number.isInteger(right) &&
						Number.isSafeInteger(result)
					)
			) ?
				this.approximation(node, ctx)
			:	result
	}

	private coercion(node: Node, ctx: Context): DynamicValue {
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` converts an object to a primitive, which runs its methods`
		)
	}

	private approximation(node: Node, ctx: Context): DynamicValue {
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` is approximated by each engine unless its operands are integers with a safe integer result`
		)
	}

	private evaluateReference(node: Node, ctx: Context): Reference {
		node = unwrapExpression(node)
		if (node.type === "Identifier")
			return this.readIdentifier(node as IdentifierReference, ctx)
		if (node.type !== "MemberExpression")
			return { value: this.evaluate(node, ctx) }
		const defined = this.readDefine(node, ctx)
		if (defined) return defined
		const base = this.evaluateReference(node.object, ctx)
		if (base.value === shortCircuit || isDynamic(base.value)) return base
		const dynamic = findDynamic(base.value)
		if (dynamic) return { value: dynamic.asOperand() }
		if (node.optional && (base.value === null || base.value === undefined))
			return { value: shortCircuit }
		const key = this.keyOf(node, ctx)
		if (isDynamic(key)) return { value: key }
		const value = this.readMember(base.value, key, node, ctx)
		return base.read ?
				{
					value,
					read: {
						root: base.read.root,
						path: [...base.read.path, key],
						value
					}
				}
			:	{ value }
	}

	private keyOf(
		node: MemberExpression,
		ctx: Context
	): PropertyKey | DynamicValue {
		if (!node.computed) return (node.property as IdentifierReference).name
		const key = this.evaluate(node.property, ctx)
		if (isDynamic(key)) return key
		return isObjectLike(key) ?
				this.coercion(node.property, ctx)
			:	(key as PropertyKey)
	}

	private consume(reference: Reference, ctx: Context): unknown {
		const { value, read } = reference
		if (
			read &&
			!isDynamic(value) &&
			!(isObjectLike(value) && this.standIns.has(value))
		)
			ctx.trace.reads.push(read)
		return value
	}

	private readDefine(
		node: MemberExpression,
		ctx: Context
	): Reference | undefined {
		const object = unwrapExpression(node.object)
		if (
			object.type !== "MemberExpression" ||
			object.computed ||
			(object.property as IdentifierReference).name !== "env" ||
			!(
				object.object.type === "MetaProperty" ||
				(object.object.type === "Identifier" &&
					object.object.name === "process" &&
					!ctx.module.scopes.referencesById.get(object.object)?.binding)
			)
		)
			return
		const name = ctx.module.textOf(node)
		if (!this.opts.define || !(name in this.opts.define)) {
			return {
				value: new DynamicValue(
					ctx.module,
					node,
					`\`${name}\` is not a build define`
				)
			}
		}
		const value = this.opts.define[name]
		return { value, read: { root: { kind: "define", name }, path: [], value } }
	}

	private readIdentifier(node: IdentifierReference, ctx: Context): Reference {
		const binding = ctx.module.scopes.referencesById.get(node)?.binding
		if (!binding) {
			return node.name in globalsByName ?
					{ value: globalsByName[node.name] }
				:	{
						value: new DynamicValue(
							ctx.module,
							node,
							`\`${node.name}\` is a global the build does not read`,
							undefined,
							"opaque"
						)
					}
		}
		for (let env = ctx.env; env; env = env.parent) {
			if (env.valuesByBinding.has(binding))
				return { value: env.valuesByBinding.get(binding) }
		}
		return this.readBinding(binding, node, ctx)
	}

	private readBinding(binding: Binding, node: Node, ctx: Context): Reference {
		const module = ctx.module
		if (binding.kind === "param") {
			const owner = binding.declaration as FunctionNode
			const ownerName = owner.id?.name ?? inferredNameOf(owner)
			return {
				value: new DynamicValue(
					module,
					node,
					writeParameterMessage(
						binding.name,
						ownerName || "a function",
						module.positionOf(binding.id)
					),
					undefined,
					"parameter"
				)
			}
		}
		if (binding.kind === "import") return this.readImport(binding, node, ctx)
		if (binding.writes.length && this.holdsTypes(binding, module)) {
			return {
				value: new DynamicValue(
					module,
					node,
					`\`${binding.name}\` is a Type assigned at ${module.positionOf(binding.writes[0])}, so it is not static`
				)
			}
		}
		const problem =
			binding.kind === "catch" ? "is a caught error"
			: binding.kind === "member" || binding.kind === "namespace" ?
				"is declared in a TypeScript namespace or enum"
			: binding.isAmbient ? "is declared without a value"
			: binding.writes.length ?
				`is ${module.scopes.bindingsById.has(binding.writes[0]) ? "declared again" : "assigned"} at ${module.positionOf(binding.writes[0])}, so its value at the site is not known`
			: module.scopes.hasDirectEval ? "is in a module that calls `eval`"
			: isLoopVariable(binding) ? "is a loop variable"
			: undefined
		if (problem) {
			return {
				value: new DynamicValue(module, node, `\`${binding.name}\` ${problem}`)
			}
		}
		if (
			ctx.origin?.module === module &&
			binding.kind !== "function" &&
			contains(binding.scope.node, ctx.origin.node) &&
			runPointOf(ctx.origin.node, binding.scope.node, module) <
				binding.declaration.start
		) {
			return {
				value: new DynamicValue(
					module,
					node,
					`\`${binding.name}\` can be read before its declaration (${module.positionOf(binding.id)})`
				)
			}
		}
		const result = this.bindingValue(binding, module)
		if (result.error !== undefined) throw result.error
		if (
			result.value instanceof InternalChainedMatchParser &&
			(binding.references.length > 1 || binding.exportNames.length)
		) {
			return {
				value: new DynamicValue(
					module,
					node,
					`\`${binding.name}\` is a match parser, which each \`.case\` mutates, and is read in more than one place`
				)
			}
		}
		if (isDynamic(result.value)) {
			const declaration = binding.declaration
			const init =
				declaration.type === "VariableDeclarator" ? declaration.init : null
			return {
				value: new DynamicValue(
					module,
					node,
					`\`${binding.name}\` is ${init ? `\`${module.snippetOf(init)}\`` : "declared"} (${module.positionOf(binding.id)})`,
					result.value
				)
			}
		}
		if (!isArkValue(result.value, this.standIns))
			mergeTrace(ctx.trace, result.trace)
		return isTracked(result.value) && this.escapeOf(binding, module) ?
				{
					value: result.value,
					read: {
						root: { kind: "binding", module, binding },
						path: [],
						value: result.value
					}
				}
			:	{ value: result.value }
	}

	valueOfBinding(binding: Binding, module: SourceModule): unknown {
		if (binding.kind !== "import")
			return this.bindingValue(binding, module).value
		const target = this.graph.importOf(binding, module)
		return (
			target.kind === "binding" ?
				this.bindingValue(target.binding, target.module).value
			: target.kind === "arktype" ? target.value
			: undefined
		)
	}

	// a hole in a definition position must not be a Type, so a binding that only ever holds Types cannot be one
	private holdsTypes(binding: Binding, module: SourceModule): boolean {
		const declaration = binding.declaration
		return (
			declaration.type === "VariableDeclarator" &&
			!!declaration.init &&
			this.graph.isArkExpression(declaration.init, module) &&
			binding.writes.every(write => {
				const assignment = write.parent
				return (
					assignment?.type === "AssignmentExpression" &&
					assignment.operator === "=" &&
					this.graph.isArkExpression(assignment.right, module)
				)
			})
		)
	}

	escapeOf(binding: Binding, module: SourceModule): DynamicValue | null {
		let result = this.escapesByBinding.get(binding)
		if (result === undefined) {
			const escape = findEscape(
				binding,
				module,
				this.graph,
				isData(this.bindingValue(binding, module).value)
			)
			result =
				escape ?
					new DynamicValue(
						module,
						escape.node,
						`\`${binding.name}\` ${escape.message} (${module.positionOf(escape.node)})`
					)
				:	null
			this.escapesByBinding.set(binding, result)
		}
		return result
	}

	private readImport(binding: Binding, node: Node, ctx: Context): Reference {
		const target = this.graph.importOf(binding, ctx.module)
		switch (target.kind) {
			case "arktype":
				return { value: target.value }
			case "namespace":
				return { value: new ModuleNamespace(target.module) }
			case "unresolved":
				return {
					value: new DynamicValue(
						ctx.module,
						node,
						target.message,
						undefined,
						"opaque"
					)
				}
			case "json":
				return {
					value: target.value,
					read: {
						root: { kind: "export", file: target.id, name: "default" },
						path: [],
						value: target.value
					}
				}
		}
		const result =
			target.kind === "binding" ?
				this.bindingValue(target.binding, target.module)
			:	this.nodeValue(target.node, target.module)
		if (result.error !== undefined) throw result.error
		if (isDynamic(result.value)) {
			return {
				value: new DynamicValue(
					ctx.module,
					node,
					`\`${binding.name}\` is imported from ${target.module.id}`,
					result.value
				)
			}
		}
		return {
			value: result.value,
			read: {
				root: {
					kind: "export",
					file: target.module.id,
					name: target.kind === "binding" ? target.name : "default"
				},
				path: [],
				value: result.value
			}
		}
	}

	private bindingValue(binding: Binding, module: SourceModule): Evaluated {
		const cached = this.valuesByBinding.get(binding)
		if (cached === "evaluating") {
			return {
				value: new DynamicValue(
					module,
					binding.id,
					`\`${binding.name}\` depends on itself`
				),
				trace: emptyTrace()
			}
		}
		if (cached) return cached
		this.valuesByBinding.set(binding, "evaluating")
		const declaration = binding.declaration
		const ctx = rootContext(module, declaration)
		let result: Evaluated
		try {
			result = {
				value:
					binding.kind === "function" ?
						this.functionStandIn(
							{
								node: declaration as FunctionNode,
								module,
								env: undefined,
								name: binding.name
							},
							declaration
						)
					: binding.kind === "class" ?
						this.classStandIn(declaration as Class, ctx)
					: binding.kind === "enum" ? this.evaluateEnum(binding, ctx)
					: this.declaredValue(binding, ctx),
				trace: ctx.trace
			}
		} catch (e) {
			result = { value: undefined, trace: ctx.trace, error: e }
		}
		this.valuesByBinding.set(binding, result)
		return result
	}

	private nodeValue(node: Node, module: SourceModule): Evaluated {
		let result = this.valuesByNode.get(node)
		if (result) return result
		const ctx = rootContext(module, node)
		try {
			result = { value: this.evaluate(node, ctx), trace: ctx.trace }
		} catch (e) {
			result = { value: undefined, trace: ctx.trace, error: e }
		}
		this.valuesByNode.set(node, result)
		return result
	}

	private declaredValue(binding: Binding, ctx: Context): unknown {
		const declarator = binding.declaration
		if (declarator.type !== "VariableDeclarator") {
			return new DynamicValue(
				ctx.module,
				binding.id,
				`\`${binding.name}\` is a TypeScript import-equals declaration`,
				undefined,
				"opaque"
			)
		}
		if (!declarator.init) return undefined
		if (declarator.id.type === "Identifier")
			return this.evaluate(declarator.init, ctx)
		const init = this.nodeValue(declarator.init, ctx.module)
		if (init.error !== undefined) throw init.error
		mergeTrace(ctx.trace, init.trace)
		const env = createEnvironment(undefined)
		this.destructure(declarator.id, init.value, { ...ctx, env })
		return env.valuesByBinding.get(binding)
	}

	private evaluateEnum(binding: Binding, ctx: Context): unknown {
		const declaration = binding.declaration as Extract<
			Node,
			{ type: "TSEnumDeclaration" }
		>
		const result: Record<string, unknown> = {}
		const enumCtx: Context = { ...ctx, env: createEnvironment(ctx.env) }
		// members may refer to the enum by name
		this.valuesByBinding.set(binding, { value: result, trace: ctx.trace })
		let next: unknown = 0
		for (const member of declaration.body.members) {
			const name =
				member.id.type === "Identifier" ? member.id.name
				: member.id.type === "Literal" ? member.id.value
				: undefined
			const value =
				name === undefined ?
					new DynamicValue(
						ctx.module,
						member,
						"a computed enum member is not in the static subset"
					)
				: member.initializer ? this.evaluate(member.initializer, enumCtx)
				: next
			if (typeof value === "number") {
				result[name!] = value
				result[value] = name
				next = value + 1
			} else if (typeof value === "string") {
				result[name!] = value
				next = new DynamicValue(
					ctx.module,
					member,
					`the enum member after \`${name}\` needs an initializer`
				)
			} else {
				return isDynamic(value) ? value : (
						new DynamicValue(
							ctx.module,
							member,
							`\`${name}\` is not a number or string`
						)
					)
			}
			enumCtx.env!.valuesByBinding.set(
				ctx.module.scopes.bindingsById.get(member.id)!,
				value
			)
		}
		return result
	}

	private destructure(pattern: Node, value: unknown, ctx: Context): void {
		switch (pattern.type) {
			case "Identifier": {
				const binding = ctx.module.scopes.bindingsById.get(pattern)
				if (binding) ctx.env!.valuesByBinding.set(binding, value)
				return
			}
			case "AssignmentPattern":
				return this.destructure(
					pattern.left,
					value === undefined ? this.evaluate(pattern.right, ctx) : value,
					ctx
				)
			case "TSParameterProperty":
				return this.destructure(pattern.parameter, value, ctx)
			case "ObjectPattern": {
				value = findDynamic(value) ?? value
				const used: PropertyKey[] = []
				for (const property of pattern.properties) {
					if (property.type === "RestElement") {
						this.destructure(
							property.argument,
							isDynamic(value) ? value : restOf(value, used),
							ctx
						)
						continue
					}
					const key =
						property.computed ? this.evaluate(property.key, ctx)
						: property.key.type === "Identifier" ? property.key.name
						: String((property.key as { value: unknown }).value)
					used.push(key as PropertyKey)
					this.destructure(
						property.value,
						isDynamic(value) ? value
						: isDynamic(key) ? key
						: this.readMember(value, key as PropertyKey, property, ctx),
						ctx
					)
				}
				return
			}
			case "ArrayPattern": {
				value = findDynamic(value) ?? value
				const items =
					Array.isArray(value) || typeof value === "string" ? [...value]
					: isDynamic(value) ? value
					: new DynamicValue(
							ctx.module,
							pattern,
							`\`${ctx.module.snippetOf(pattern)}\` destructures a value other than an array or string by position`
						)
				for (let i = 0; i < pattern.elements.length; i++) {
					const element = pattern.elements[i]
					if (!element) continue
					const isRest = element.type === "RestElement"
					this.destructure(
						isRest ? element.argument : element,
						isDynamic(items) ? items
						: isRest ? items.slice(i)
						: items[i],
						ctx
					)
				}
			}
		}
	}

	readMember(
		object: unknown,
		key: PropertyKey,
		node: Node,
		ctx: Context
	): unknown {
		if (object instanceof ModuleNamespace)
			return this.readNamespaceMember(object, String(key), node, ctx)
		if (object === null || object === undefined) {
			throw new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` reads a property of ${object}, which throws`
			)
		}
		if (typeof object === "string") {
			return (
					key === "length" || (typeof key === "string" && /^\d+$/.test(key))
				) ?
					Reflect.get(Object(object), key)
				:	this.notOwnData(node, ctx)
		}
		if (!isObjectLike(object)) return this.notOwnData(node, ctx)
		if (this.standIns.has(object)) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` reads a property of a function the build does not interpret`,
				undefined,
				"opaque"
			)
		}
		if (intrinsics.has(object)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(object, key)
			return (
					(descriptor &&
						"value" in descriptor &&
						!isObjectLike(descriptor.value)) ||
						pureBuiltins.has(descriptor?.value)
				) ?
					descriptor!.value
				:	new DynamicValue(
						ctx.module,
						node,
						`\`${ctx.module.snippetOf(node)}\` is not one of the build's pure built-ins`
					)
		}
		if (isPlainContainer(object)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(object, key)
			if (descriptor) {
				return "value" in descriptor ?
						descriptor.value
					:	this.notOwnData(node, ctx)
			}
			return key in object ? this.notOwnData(node, ctx) : undefined
		}
		if (object instanceof Date || object instanceof RegExp)
			return this.notOwnData(node, ctx)
		if (
			typeof key === "string" &&
			key in unstableArkMembers &&
			!hasArkKind(object, "module")
		) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` is derived from registry names or node ids, which are not stable`
			)
		}
		const value = Reflect.get(object, key)
		if (typeof key === "string" && key in runtimeMembers && isObjectLike(value))
			this.validators.add(value)
		return intrinsics.has(value) ? this.notOwnData(node, ctx) : value
	}

	private readNamespaceMember(
		namespace: ModuleNamespace,
		name: string,
		node: Node,
		ctx: Context
	): unknown {
		const target = this.graph.exportOf(namespace.module, name)
		switch (target.kind) {
			case "unresolved":
				return new DynamicValue(
					ctx.module,
					node,
					target.message,
					undefined,
					"opaque"
				)
			case "arktype":
				return target.value
			case "binding":
			case "expression": {
				const result =
					target.kind === "binding" ?
						this.bindingValue(target.binding, target.module)
					:	this.nodeValue(target.node, target.module)
				if (result.error !== undefined) throw result.error
				if (
					!isDynamic(result.value) &&
					!(isObjectLike(result.value) && this.standIns.has(result.value))
				) {
					ctx.trace.reads.push({
						root: { kind: "export", file: target.module.id, name },
						path: [],
						value: result.value
					})
				}
				return result.value
			}
		}
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` reads a nested namespace import`
		)
	}

	private notOwnData(node: Node, ctx: Context): DynamicValue {
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` does not read an own data property`
		)
	}

	private evaluateCall(node: CallExpression, ctx: Context): unknown {
		const callee = unwrapExpression(node.callee)
		let receiver: unknown
		let fn: unknown
		if (callee.type === "MemberExpression") {
			receiver = this.consume(this.evaluateReference(callee.object, ctx), ctx)
			if (receiver === shortCircuit || isDynamic(receiver)) return receiver
			if (callee.optional && (receiver === null || receiver === undefined))
				return shortCircuit
			const key = this.keyOf(callee, ctx)
			if (isDynamic(key)) return key
			const kind = receiverKindOf(receiver)
			if (kind) {
				fn = methodsByReceiverKind[kind][key as string]
				if (!fn) {
					return new DynamicValue(
						ctx.module,
						node,
						`\`${ctx.module.snippetOf(callee)}\` is not one of the build's pure built-ins`
					)
				}
			} else if (isPlainContainer(receiver) && !this.arkObjects.has(receiver)) {
				return new DynamicValue(
					ctx.module,
					node,
					`\`${ctx.module.snippetOf(callee)}\` is a function reached through a property rather than a binding`,
					undefined,
					"opaque"
				)
			} else {
				fn = this.readMember(receiver, key, callee, ctx)
				if (receiver instanceof ModuleNamespace) receiver = undefined
			}
		} else fn = this.evaluate(callee, ctx)
		if (fn === shortCircuit) return fn
		if (node.optional && (fn === null || fn === undefined)) return shortCircuit
		const args: unknown[] = []
		for (const arg of node.arguments) {
			if (arg.type !== "SpreadElement") args.push(this.evaluate(arg, ctx))
			else {
				const items = this.spreadItemsOf(arg, ctx)
				if (isDynamic(items)) return items
				args.push(...items)
			}
		}
		return this.call(fn, receiver, args, node, ctx)
	}

	call(
		fn: unknown,
		receiver: unknown,
		args: unknown[],
		node: Node,
		ctx: Context
	): unknown {
		if (isDynamic(fn)) return fn
		const standIn = isObjectLike(fn) ? this.standIns.get(fn) : undefined
		if (standIn) {
			if (standIn.closure && staticBodyOf(standIn.closure.node))
				return this.interpretCall(standIn.closure, args, node, ctx)
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` calls a function the build does not interpret`,
				standIn.closure && this.notStaticHelper(standIn),
				"opaque"
			)
		}
		if (pureBuiltins.has(fn as Function) || receiverKindOf(receiver))
			return this.callBuiltin(fn as Function, args, receiver, node, ctx)
		if (typeof fn !== "function" || intrinsics.has(fn)) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` does not call a static helper or pure built-in`
			)
		}
		if (isValidator(fn) || this.validators.has(fn)) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` validates data, which happens at runtime`,
				undefined,
				"validation"
			)
		}
		return this.callArktype(fn, args, receiver, node, ctx)
	}

	private callBuiltin(
		fn: Function,
		args: unknown[],
		receiver: unknown,
		node: Node,
		ctx: Context
	): unknown {
		const dynamic = findDynamic([receiver, ...args])
		if (dynamic) return dynamic
		const builtin = pureBuiltins.get(fn)
		const problem = builtin?.check?.(args, receiver)
		if (problem) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` ${problem}`
			)
		}
		let result: unknown
		const previous = this.active
		this.active = { ctx, isArktype: false }
		try {
			result = Reflect.apply(fn, receiver, args)
		} catch (e) {
			if (e instanceof DynamicValue) return e
			throw this.thrown(e, node, ctx)
		} finally {
			this.active = previous
		}
		const isApproximate =
			builtin?.isApproximate ?
				!args.every(arg => Number.isInteger(arg)) ||
				!Number.isSafeInteger(result)
			:	fn === Number.prototype.toString &&
				args[0] !== undefined &&
				args[0] !== 10 &&
				!Number.isInteger(receiver)
		return isApproximate ? this.approximation(node, ctx) : result
	}

	private thrown(
		e: unknown,
		node: Node,
		ctx: Context
	): DynamicValue | ParseError {
		return e instanceof DynamicValue || e instanceof ParseError ?
				e
			:	new DynamicValue(
					ctx.module,
					node,
					`\`${ctx.module.snippetOf(node)}\` throws ${String(e)} at build`
				)
	}

	private callArktype(
		fn: Function,
		args: unknown[],
		receiver: unknown,
		node: Node,
		ctx: Context
	): unknown {
		ctx.site?.requests.push([node, ctx.module])
		const converted: unknown[] = []
		for (const arg of args) {
			const value = this.toArktype(arg)
			if (isDynamic(value)) return value
			converted.push(value)
		}
		if (ctx.site) collectHoles(converted, ctx.site.holes, this.standIns)
		const previous = this.active
		this.active = { ctx, isArktype: true }
		try {
			const result = Reflect.apply(fn, receiver, converted)
			if (isPlainContainer(result)) this.arkObjects.add(result)
			return result
		} catch (e) {
			throw this.thrown(e, node, ctx)
		} finally {
			this.active = previous
		}
	}

	toArktype(value: unknown): unknown {
		if (isDynamic(value)) {
			if (!value.isOpaque) return value
			let opaque = this.opaqueByDynamic.get(value)
			if (!opaque) {
				opaque = this.opaqueStandIn(value)
				this.opaqueByDynamic.set(value, opaque)
			}
			return opaque
		}
		if (value instanceof ModuleNamespace) {
			return new DynamicValue(
				value.module,
				value.module.program,
				"a namespace import used as a value is not in the static subset"
			)
		}
		if (!isPlainContainer(value)) return value
		let copy: object | undefined
		for (const k of Reflect.ownKeys(value)) {
			const child = Reflect.get(value, k)
			const converted = this.toArktype(child)
			if (isDynamic(converted)) return converted
			if (converted === child) continue
			copy ??=
				Array.isArray(value) ?
					[...value]
				:	Object.assign(Object.create(Object.getPrototypeOf(value)), value)
			Reflect.set(copy!, k, converted)
		}
		return copy ?? value
	}

	private interpretCall(
		closure: Closure,
		args: unknown[],
		node: Node,
		ctx: Context
	): unknown {
		if (ctx.depth > maxDepth) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` nests static helper calls too deeply`
			)
		}
		const callCtx: Context = {
			...ctx,
			module: closure.module,
			env: createEnvironment(closure.env),
			depth: ctx.depth + 1
		}
		const params = closure.node.params
		for (let i = 0; i < params.length; i++) {
			const param = params[i]
			if (param.type === "RestElement")
				this.destructure(param.argument, args.slice(i), callCtx)
			else this.destructure(param, args[i], callCtx)
		}
		if (isBoundFunction(closure.node))
			pushUnique(ctx.trace.helpers, closure.node, closure.module)
		if (ctx.site && closure.module === ctx.site.module)
			ctx.site.interpreted.add(closure.node)
		return this.evaluate(staticBodyOf(closure.node)!, callCtx)
	}

	private evaluateNew(node: NewExpression, ctx: Context): unknown {
		const callee = this.evaluate(node.callee, ctx)
		if (isDynamic(callee)) return callee
		const args: unknown[] = []
		for (const arg of node.arguments) {
			const value =
				arg.type === "SpreadElement" ?
					this.spreadItemsOf(arg, ctx)
				:	this.evaluate(arg, ctx)
			if (isDynamic(value)) return value
			if (arg.type === "SpreadElement") args.push(...(value as unknown[]))
			else args.push(value)
		}
		if (callee === RegExp) {
			const dynamic = findDynamic(args)
			if (dynamic) return dynamic
			try {
				return new RegExp(args[0] as string, args[1] as string)
			} catch (e) {
				throw this.thrown(e, node, ctx)
			}
		}
		const [arg] = args
		if (
			callee === Date &&
			args.length === 1 &&
			(typeof arg === "number" ||
				(typeof arg === "string" && isTimeZoneFreeDate(arg)))
		)
			return new Date(arg)
		if (callee === Date) {
			return new DynamicValue(
				ctx.module,
				node,
				`\`${ctx.module.snippetOf(node)}\` reads the ${args.length ? "time zone" : "clock"}`
			)
		}
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` constructs a value other than a Date or RegExp`,
			undefined,
			"opaque"
		)
	}

	private functionStandIn(closure: Closure, node: Node): object {
		const arity = parameterCount(closure.node)
		const standIn: StandIn = {
			kind: "function",
			module: closure.module,
			node,
			closure,
			dynamic: undefined,
			arity,
			isCalled: false,
			isDefinition: false
		}
		const target =
			closure.node.type === "ArrowFunctionExpression" ? () => {} : class {}
		const proxy = new Proxy(target, {
			get: (target, key) =>
				key === "length" ? arity
				: key === "name" ? closure.name
				: Reflect.get(target, key),
			apply: (_, __, args: unknown[]) => this.callStandIn(standIn, args),
			construct: () => {
				throw this.calledAtDefinition(standIn, undefined)
			}
		})
		this.standIns.set(proxy, standIn)
		return proxy
	}

	private callStandIn(standIn: StandIn, args: unknown[]): unknown {
		const active = this.active
		if (active?.isArktype) standIn.isCalled = true
		const closure = standIn.closure!
		if (!staticBodyOf(closure.node)) {
			throw active?.isArktype === false ?
					this.notStaticHelper(standIn)
				:	this.calledAtDefinition(standIn, undefined)
		}
		const result = this.interpretCall(
			closure,
			args,
			closure.node,
			active?.ctx ?? rootContext(closure.module, undefined)
		)
		if (!active?.isArktype) {
			if (isDynamic(result)) throw result
			return result
		}
		const converted = this.toArktype(result)
		if (isDynamic(converted)) throw this.calledAtDefinition(standIn, converted)
		return converted
	}

	private notStaticHelper(standIn: StandIn): DynamicValue {
		return new DynamicValue(
			standIn.module,
			standIn.node,
			writeNotStaticHelperMessage(
				standIn.closure?.name ? `\`${standIn.closure.name}\`` : "the function",
				standIn.module.positionOf(standIn.node)
			)
		)
	}

	private calledAtDefinition(
		standIn: StandIn,
		cause: DynamicValue | undefined
	): DynamicValue {
		const name =
			standIn.closure?.name ? `\`${standIn.closure.name}\``
			: standIn.kind === "class" ? "a class"
			: "a function"
		return new DynamicValue(
			standIn.module,
			standIn.node,
			writeCalledAtDefinitionMessage(
				name,
				standIn.module.positionOf(standIn.node)
			),
			cause ??
				standIn.dynamic ??
				(standIn.closure ? this.notStaticHelper(standIn) : undefined),
			"callback"
		)
	}

	private classStandIn(node: Class, ctx: Context): object {
		const base =
			node.superClass ? this.evaluate(node.superClass, ctx) : undefined
		const effect = node.body.body.find(
			element =>
				!(
					(element.type === "MethodDefinition" && element.kind === "method") ||
					(element.type === "PropertyDefinition" &&
						(element.declare || !element.value)) ||
					element.type === "TSIndexSignature"
				)
		)
		const target =
			typeof base === "function" ?
				class extends (base as new () => object) {}
			:	class {}
		const constructor = node.body.body.find(
			element =>
				element.type === "MethodDefinition" && element.kind === "constructor"
		) as MethodDefinition | undefined
		Object.defineProperty(target, "name", { value: node.id?.name ?? "" })
		Object.defineProperty(target, "length", {
			value: constructor ? parameterCount(constructor.value) : 0
		})
		const standIn: StandIn = {
			kind: "class",
			module: ctx.module,
			node,
			closure: undefined,
			dynamic: undefined,
			arity: undefined,
			isCalled: false,
			isDefinition: false
		}
		const proxy = new Proxy(target, {
			apply: () => {
				standIn.isCalled = true
				throw new DynamicValue(
					ctx.module,
					node,
					`arktype calls the class \`${target.name}\` (${ctx.module.positionOf(node)}) as a function, which throws a TypeError`,
					undefined,
					"callback"
				)
			},
			construct: (target, args, newTarget) => {
				standIn.isCalled = true
				if (effect) {
					throw this.calledAtDefinition(
						standIn,
						new DynamicValue(
							ctx.module,
							effect,
							`\`${ctx.module.snippetOf(effect)}\` runs when the class is constructed`
						)
					)
				}
				return Reflect.construct(target, args, newTarget)
			}
		})
		this.standIns.set(proxy, standIn)
		return proxy
	}

	private opaqueStandIn(dynamic: DynamicValue): object {
		const standIn: StandIn = {
			kind: "opaque",
			module: dynamic.module,
			node: dynamic.node,
			closure: undefined,
			dynamic,
			arity: undefined,
			isCalled: false,
			isDefinition: false
		}
		// an opaque value is a Standard Schema in a definition and a function elsewhere
		const proxy = new Proxy(class {}, {
			getPrototypeOf: () => Object.prototype,
			has: (target, key) => {
				if (key !== "~standard") return Reflect.has(target, key)
				standIn.isDefinition = true
				return true
			},
			get: (target, key) =>
				key === "length" ? 1
				: key === "name" ? ""
				: Reflect.get(target, key),
			apply: () => {
				standIn.isCalled = true
				throw this.calledAtDefinition(standIn, undefined)
			},
			construct: () => {
				throw this.calledAtDefinition(standIn, undefined)
			}
		})
		this.standIns.set(proxy, standIn)
		return proxy
	}
}

export const isDynamic = (value: unknown): value is DynamicValue =>
	value instanceof DynamicValue

export const isObjectLike = (value: unknown): value is object =>
	(typeof value === "object" && value !== null) || typeof value === "function"

export type PlainContainer = Record<PropertyKey, unknown> | unknown[]

export const isPlainContainer = (value: unknown): value is PlainContainer => {
	if (Array.isArray(value)) return true
	if (typeof value !== "object" || value === null || intrinsics.has(value))
		return false
	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

// Types, matchers and typed functions run their arguments through validation
export const isValidator = (value: unknown): boolean =>
	hasArkKind(value, "root") || value instanceof InternalTypedFn

const isArkValue = (
	value: unknown,
	standIns: WeakMap<object, StandIn>
): boolean =>
	isObjectLike(value) &&
	!isPlainContainer(value) &&
	!standIns.has(value) &&
	!intrinsics.has(value) &&
	!isDynamic(value) &&
	!(value instanceof ModuleNamespace) &&
	!(value instanceof Date) &&
	!(value instanceof RegExp)

// objects whose contents the program can change after the build reads them
const isTracked = (value: unknown): value is object =>
	isPlainContainer(value) || value instanceof Date || value instanceof RegExp

const isData = (value: unknown, seen = new Set<unknown>()): boolean => {
	if (!isObjectLike(value)) return true
	if (!isPlainContainer(value)) return false
	if (seen.has(value)) return true
	seen.add(value)
	return Reflect.ownKeys(value).every(k => isData(Reflect.get(value, k), seen))
}

export const findDynamic = (
	value: unknown,
	seen = new Set<unknown>()
): DynamicValue | undefined => {
	if (isDynamic(value)) return value
	if (!isPlainContainer(value) || seen.has(value)) return
	seen.add(value)
	for (const k of Reflect.ownKeys(value)) {
		const dynamic = findDynamic(Reflect.get(value, k), seen)
		if (dynamic) return dynamic
	}
}

const collectHoles = (
	value: unknown,
	holes: unknown[],
	standIns: WeakMap<object, StandIn>,
	seen = new Set<unknown>()
): void => {
	if (seen.has(value)) return
	seen.add(value)
	if (
		typeof value === "symbol" ||
		(isObjectLike(value) && standIns.has(value))
	) {
		if (!holes.includes(value)) holes.push(value)
		return
	}
	if (!isPlainContainer(value)) return
	for (const k of Reflect.ownKeys(value)) {
		if (typeof k === "symbol") collectHoles(k, holes, standIns, seen)
		collectHoles(Reflect.get(value, k), holes, standIns, seen)
	}
}

const restOf = (value: unknown, used: PropertyKey[]) => {
	const result: Record<PropertyKey, unknown> = {}
	if (!isPlainContainer(value)) return result
	for (const k of Reflect.ownKeys(value)) {
		if (
			!used.includes(k) &&
			Object.prototype.propertyIsEnumerable.call(value, k)
		)
			defineData(result, k, Reflect.get(value, k))
	}
	return result
}

const receiverKindOf = (value: unknown): MethodReceiverKind | undefined =>
	typeof value === "string" ? "string"
	: typeof value === "number" ? "number"
	: typeof value === "boolean" ? "boolean"
	: typeof value === "bigint" ? "bigint"
	: Array.isArray(value) ? "array"
	: value instanceof Date ? "date"
	: undefined

const defineData = (o: object, k: PropertyKey, v: unknown) =>
	Object.defineProperty(o, k, {
		value: v,
		writable: true,
		enumerable: true,
		configurable: true
	})

const createEnvironment = (parent: Environment | undefined): Environment => ({
	valuesByBinding: new Map(),
	parent
})

const emptyTrace = (): Trace => ({ reads: [], helpers: [] })

const rootContext = (
	module: SourceModule,
	node: Node | undefined
): Context => ({
	module,
	env: undefined,
	trace: emptyTrace(),
	site: undefined,
	origin: node && { module, node },
	depth: 0
})

const mergeTrace = (into: Trace, from: Trace) => {
	for (const read of from.reads) into.reads.push(read)
	for (const [node, module] of from.helpers)
		pushUnique(into.helpers, node, module)
}

const pushUnique = (
	helpers: [FunctionNode, SourceModule][],
	node: FunctionNode,
	module: SourceModule
) => {
	if (!helpers.some(([n]) => n === node)) helpers.push([node, module])
}

// the earliest offset in `scope` at which code at `node` can run: its own, or the first that can call the function holding it
const runPointOf = (
	node: Node,
	scope: Node,
	module: SourceModule,
	seen = new Set<Node>()
): number => {
	for (
		let parent = node.parent;
		parent && parent !== scope;
		parent = parent.parent
	) {
		if (parent.type === "ClassBody")
			return runPointOf(parent.parent!, scope, module, seen)
		if (!isFunctionNode(parent)) continue
		if (seen.has(parent)) return Infinity
		seen.add(parent)
		const binding = bindingOfFunction(parent, module)
		if (!binding) return runPointOf(parent, scope, module, seen)
		let result = Infinity
		for (const reference of binding.references)
			result = Math.min(result, runPointOf(reference.id, scope, module, seen))
		return result
	}
	return node.start
}

const isBoundFunction = (node: FunctionNode): boolean =>
	node.type === "FunctionDeclaration" ||
	(node.parent?.type === "VariableDeclarator" && node.parent.init === node)

const isLoopVariable = (binding: Binding) => {
	const declaration = binding.declaration.parent
	const loop = declaration?.parent
	return (
		(loop?.type === "ForInStatement" || loop?.type === "ForOfStatement") &&
		loop.left === declaration
	)
}

const parameterCount = (fn: FunctionNode): number => {
	let count = 0
	for (const param of fn.params) {
		if (param.type === "AssignmentPattern" || param.type === "RestElement")
			break
		count++
	}
	return count
}

const inferredNameOf = (node: Node): string => {
	const parent = node.parent
	return (
		parent?.type === "VariableDeclarator" && parent.id.type === "Identifier" ?
			parent.id.name
		: (
			parent?.type === "Property" &&
			!parent.computed &&
			parent.key.type === "Identifier"
		) ?
			parent.key.name
		:	""
	)
}

// date-only forms, and date-times with `Z` or an offset, are the forms that do not read the time zone
const isTimeZoneFreeDate = (s: string) =>
	/^(\d{4}|[+-]\d{6})(-\d{2}(-\d{2})?)?$/.test(s) ||
	/^(\d{4}|[+-]\d{6})-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
		s
	)

const unaryOperators: Record<string, (value: any) => unknown> = {
	"-": value => -value,
	"+": value => +value,
	"~": value => ~value
}

const binaryOperators: Record<string, (l: any, r: any) => unknown> = {
	// eslint-disable-next-line eqeqeq
	"==": (l, r) => l == r,
	// eslint-disable-next-line eqeqeq
	"!=": (l, r) => l != r,
	"<": (l, r) => l < r,
	"<=": (l, r) => l <= r,
	">": (l, r) => l > r,
	">=": (l, r) => l >= r,
	"+": (l, r) => l + r,
	"-": (l, r) => l - r,
	"*": (l, r) => l * r,
	"/": (l, r) => l / r,
	"%": (l, r) => l % r,
	"**": (l, r) => l ** r,
	"|": (l, r) => l | r,
	"&": (l, r) => l & r,
	"^": (l, r) => l ^ r,
	"<<": (l, r) => l << r,
	">>": (l, r) => l >> r,
	">>>": (l, r) => l >>> r
}

const unsupportedDescriptions: Record<string, string> = {
	AssignmentExpression: "an assignment",
	UpdateExpression: "an update",
	AwaitExpression: "`await`",
	YieldExpression: "`yield`",
	ThisExpression: "`this`",
	Super: "`super`",
	ImportExpression: "a dynamic import",
	MetaProperty: "`import.meta`",
	JSXElement: "JSX",
	JSXFragment: "JSX"
}
