import { arkKind, hasArkKind, type BaseRoot } from "@ark/schema"
import { hashOf, hasDomain, ParseError } from "@ark/util"
import { InternalTypedFn } from "arktype/internal/fn.ts"
import { InternalChainedMatchParser } from "arktype/internal/match.ts"
import { holeNamePattern, holeNamePrefix } from "arktype/internal/standalone.ts"
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
	isArkValue,
	isObject,
	isPlainContainer,
	methodsByReceiverKind,
	pureBuiltins,
	type MethodReceiverKind,
	type PureBuiltin
} from "./builtins.ts"
import { DynamicValue, type DynamicCode } from "./dynamic.ts"
import {
	bindingOfFunction,
	contains,
	isFunctionNode,
	runtimeMembers,
	unstableArkMembers,
	staticBodyOf,
	validatorMembers,
	type FunctionNode,
	type ImportTarget,
	type ModuleGraph
} from "./graph.ts"
import type { SourceModule } from "./module.ts"
import {
	isTransparent,
	runtimeParamsOf,
	unwrapExpression,
	type Binding
} from "./scope.ts"

export interface InterpreterOptions {
	// values of bundler `define` constants, keyed by the expression they replace
	define?: Record<string, unknown> | undefined
	// ship arktype and precompile only the code it compiles, rather than folding every arktype expression into a validator
	runtime?: "arktype" | undefined
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
	// each function the build interprets a call to
	helpers: [FunctionNode, SourceModule][]
	// each function read from another module's export, which a test runner's module mock can replace
	exportedFunctions: Read[]
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
	// each outermost expression in the site's source that evaluates to a hole or a Type it reads
	readsByValue: Map<unknown, Node[]>
	// each member the site reads of a Type, Scope or Generic, which a standalone build replaces with a value without it
	unavailableReads: UnavailableRead[]
	holes: unknown[]
	interpreted: Set<Node>
	// each call into arktype's API
	requests: [Node, SourceModule][]
	// each Type a request returned
	roots: BaseRoot[]
	value: unknown
	error: DynamicValue | ParseError | undefined
	isEvaluated: boolean
}

export interface UnavailableRead {
	node: Node
	key: PropertyKey
	replacedBy: "validator" | "Scope" | "Generic"
}

export const createSiteState = (
	node: Node,
	module: SourceModule
): SiteState => ({
	node,
	module,
	trace: emptyTrace(),
	readsByValue: new Map(),
	unavailableReads: [],
	holes: [],
	interpreted: new Set(),
	requests: [],
	roots: [],
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

interface Lookup {
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
	sourcesBySymbol = new Map<symbol, [Node, SourceModule]>()
	// what each function, class or symbol expression outside a call evaluated to, which every evaluation of it reuses
	private standInsByNode = new Map<Node, object>()
	private symbolsByNode = new Map<Node, symbol>()
	private valuesByBinding = new Map<Binding, Evaluated | "evaluating">()
	private valuesByNode = new Map<Node, Evaluated>()
	// unknown values a declaration computes, which it computes at runtime however a site uses them
	private declaredDynamics = new WeakSet<DynamicValue>()
	private opaqueByDynamic = new WeakMap<DynamicValue, object>()
	private validators = new WeakSet<object>()
	private arkObjects = new WeakSet<object>()
	private opaqueStandInsByValue = new WeakMap<object, StandIn>()
	private standInsByName = new Map<string, StandIn>()
	private activeCall: { ctx: Context; isArktype: boolean } | undefined

	constructor(graph: ModuleGraph, opts: InterpreterOptions = {}) {
		this.graph = graph
		this.opts = opts
	}

	// the expression that creates a hole and its module
	sourceOf(hole: unknown): [Node, SourceModule] | undefined {
		if (typeof hole === "symbol") return this.sourcesBySymbol.get(hole)
		const standIn = hasDomain(hole, "object") && this.standIns.get(hole)
		return standIn ? [standIn.node, standIn.module] : undefined
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
			const value = this.evaluateNode(site.node, ctx)
			// a site inside an optional chain ends where the chain does
			site.value = value === shortCircuit ? undefined : value
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
		let value = this.evaluateNode(node, ctx)
		if (typeof value === "symbol" && !this.sourcesBySymbol.has(value)) {
			const evaluated = !ctx.env && this.symbolsByNode.get(node)
			if (evaluated) value = evaluated
			else {
				this.sourcesBySymbol.set(value, [node, ctx.module])
				if (!ctx.env) this.symbolsByNode.set(node, value)
			}
		}
		this.recordRead(node, value, ctx)
		return value
	}

	private recordRead(node: Node, value: unknown, ctx: Context): void {
		if (
			!ctx.site ||
			ctx.module !== ctx.site.module ||
			!contains(ctx.site.node, node) ||
			!(
				typeof value === "symbol" ||
				value instanceof DynamicValue ||
				(hasDomain(value, "object") && this.standIns.has(value)) ||
				// a Type the site reads, which its factory receives to take the holes it holds
				(hasArkKind(value, "root") && isReference(node))
			)
		)
			return
		// an expression is evaluated after those it contains, so it replaces them
		const reads = (ctx.site.readsByValue.get(value) ?? []).filter(
			read => !contains(node, read)
		)
		if (!reads.some(read => contains(read, node))) reads.push(node)
		ctx.site.readsByValue.set(value, reads)
	}

	private evaluateNode(node: Node, ctx: Context): unknown {
		if (isTransparent(node)) return this.evaluate(node.expression, ctx)
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
						name: inferredNameOf(node)
					},
					node
				)
			case "ClassExpression":
				return this.classStandIn(node, ctx)
		}
		return new DynamicValue(
			ctx.module,
			node,
			`${unsupportedDescriptions[node.type] ?? `\`${ctx.module.snippetOf(node)}\``} is not in the static subset`
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
			:	this.reject(spread, ctx, "spreads a value other than an array or string")
	}

	private evaluateTemplate(node: TemplateLiteral, ctx: Context): unknown {
		let result = node.quasis[0].value.cooked!
		for (let i = 0; i < node.expressions.length; i++) {
			const value = this.evaluate(node.expressions[i], ctx)
			if (isDynamic(value)) return value.asOperand()
			if (hasDomain(value, "object"))
				return this.coercion(node.expressions[i], ctx)
			if (typeof value === "symbol") {
				return this.reject(
					node.expressions[i],
					ctx,
					"converts a symbol to a string, which throws"
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
					return this.reject(
						property,
						ctx,
						"spreads a value other than an object literal or Module"
					)
				}
				const copy: object = { ...(spread as object) }
				for (const k of Reflect.ownKeys(copy)) {
					const problem = this.overwriteProblem(result, k, property, ctx)
					if (problem) return problem
					defineData(result, k, Reflect.get(copy, k))
				}
				continue
			}
			if (property.kind !== "init") {
				return this.reject(
					property,
					ctx,
					"is an accessor, which runs code when arktype reads the definition"
				)
			}
			const key =
				property.computed ? this.evaluate(property.key, ctx)
				: property.key.type === "Identifier" ? property.key.name
				: String((property.key as { value: unknown }).value)
			if (isDynamic(key)) return key
			if (hasDomain(key, "object")) return this.coercion(property.key, ctx)
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
			const problem = this.overwriteProblem(
				result,
				key as PropertyKey,
				property,
				ctx
			)
			if (problem) return problem
			const value = this.evaluate(property.value, ctx)
			if (isDynamic(value) && !value.isOpaque) return value
			defineData(result, key as PropertyKey, value)
		}
		return result
	}

	// a site that drops an unknown value it computed would leave out the computation, perhaps a call that throws
	private overwriteProblem(
		result: Record<PropertyKey, unknown>,
		key: PropertyKey,
		node: Node,
		ctx: Context
	): DynamicValue | undefined {
		if (!ctx.site) return
		const dynamic = findDynamic(
			result[key],
			dynamic => !this.declaredDynamics.has(dynamic)
		)
		return (
			dynamic &&
			this.reject(
				node,
				ctx,
				"overwrites a value the build does not know",
				dynamic.asOperand()
			)
		)
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
		if (hasDomain(argument, "object")) return this.coercion(node, ctx)
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
			case "!==":
				if (isArkValue(left) && isArkValue(right)) {
					return this.reject(
						node,
						ctx,
						"compares arktype values by identity, which is unspecified"
					)
				}
				return node.operator === "===" ? left === right : left !== right
			case "instanceof":
				return new DynamicValue(
					ctx.module,
					node,
					"`instanceof` is not in the static subset"
				)
			case "in":
				if (!isPlainContainer(right)) {
					return this.reject(
						node,
						ctx,
						"checks a key of a value other than an object literal"
					)
				}
				if (hasDomain(left, "object")) return this.coercion(node.left, ctx)
				return (left as PropertyKey) in right
		}
		if (hasDomain(left, "object") || hasDomain(right, "object"))
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

	private reject(
		node: Node,
		ctx: Context,
		problem: string,
		cause?: DynamicValue,
		code?: DynamicCode
	): DynamicValue {
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` ${problem}`,
			cause,
			code
		)
	}

	private coercion(node: Node, ctx: Context): DynamicValue {
		return this.reject(
			node,
			ctx,
			"converts an object to a primitive, which runs its methods"
		)
	}

	private approximation(node: Node, ctx: Context): DynamicValue {
		return this.reject(
			node,
			ctx,
			"is approximated by each engine unless its operands are integers with a safe integer result"
		)
	}

	private evaluateReference(node: Node, ctx: Context): Lookup {
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
		return hasDomain(key, "object") ?
				this.coercion(node.property, ctx)
			:	(key as PropertyKey)
	}

	private consume(lookup: Lookup, ctx: Context): unknown {
		const { value, read } = lookup
		if (!read || isDynamic(value)) return value
		if (!(hasDomain(value, "object") && this.standIns.has(value)))
			ctx.trace.reads.push(read)
		else if (read.root.kind === "export" && !read.path.length)
			ctx.trace.exportedFunctions.push(read)
		return value
	}

	private readDefine(node: MemberExpression, ctx: Context): Lookup | undefined {
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

	private readIdentifier(node: IdentifierReference, ctx: Context): Lookup {
		const binding = ctx.module.scopes.referencesById.get(node)?.binding
		if (!binding) {
			return node.name in globalsByName ?
					{ value: globalsByName[node.name] }
				:	{
						value: new DynamicValue(
							ctx.module,
							node,
							`\`${node.name}\` is a global the build does not read`
						)
					}
		}
		for (let env = ctx.env; env; env = env.parent) {
			if (env.valuesByBinding.has(binding))
				return { value: env.valuesByBinding.get(binding) }
		}
		return this.readBinding(binding, node, ctx)
	}

	private readBinding(binding: Binding, node: Node, ctx: Context): Lookup {
		const module = ctx.module
		if (binding.kind === "param") {
			const ownerName = inferredNameOf(binding.declaration as FunctionNode)
			return {
				value: new DynamicValue(
					module,
					node,
					`\`${binding.name}\` is a parameter of ${ownerName || "a function"} (${module.positionOf(binding.id)}); its value is known only at runtime`,
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
		const problem = staticProblemOf(binding, module)
		if (problem) {
			return {
				value: new DynamicValue(module, node, `\`${binding.name}\` ${problem}`)
			}
		}
		if (
			ctx.origin?.module === module &&
			binding.kind !== "function" &&
			contains(binding.scope.node, ctx.origin.node) &&
			runPointOf(ctx.origin.node, binding.scope.node, module) < setAt(binding)
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
		if (!isArkValue(result.value) || readsAgain(result.value))
			mergeTrace(ctx.trace, result.trace)
		else {
			// arktype values cannot change, so one read where the binding was declared, like an import behind an alias, holds at the site
			for (const read of result.trace.reads)
				if (isArkValue(read.value)) ctx.trace.reads.push(read)
		}
		return isChangeable(result.value) ?
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

	private readImport(binding: Binding, node: Node, ctx: Context): Lookup {
		const target = this.graph.importOf(binding, ctx.module)
		switch (target.kind) {
			case "arktype":
				return { value: target.value }
			case "arktypeNamespace":
				this.arkObjects.add(target.value)
				return { value: target.value }
			case "namespace":
				return { value: new ModuleNamespace(target.module) }
			case "unresolved":
				return {
					value: new DynamicValue(
						ctx.module,
						node,
						`\`${binding.name}\` is an import the build cannot follow`,
						new DynamicValue(ctx.module, node, target.message)
					)
				}
			case "package":
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
		const result = this.exportValue(target)
		if (result.error !== undefined) throw result.error
		if (isDynamic(result.value)) {
			return {
				value: new DynamicValue(
					ctx.module,
					node,
					`\`${binding.name}\` is imported from ${target.module.path}`,
					result.value
				)
			}
		}
		if (readsAgain(result.value)) mergeTrace(ctx.trace, result.trace)
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

	// an export is static only if its own module could not change it
	private exportValue(
		target: Extract<ImportTarget, { kind: "binding" | "expression" }>
	): Evaluated {
		if (target.kind === "expression")
			return this.nodeValue(target.node, target.module)
		const problem = staticProblemOf(target.binding, target.module)
		return problem ?
				{
					value: new DynamicValue(
						target.module,
						target.binding.id,
						`\`${target.binding.name}\` ${problem}`
					),
					trace: emptyTrace()
				}
			:	this.bindingValue(target.binding, target.module)
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
		this.markDeclared(result.value)
		this.valuesByBinding.set(binding, result)
		return result
	}

	private markDeclared(value: unknown): void {
		findDynamic(value, dynamic => {
			this.declaredDynamics.add(dynamic)
			return false
		})
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
		this.markDeclared(result.value)
		this.valuesByNode.set(node, result)
		return result
	}

	private declaredValue(binding: Binding, ctx: Context): unknown {
		const declarator = binding.declaration
		if (declarator.type !== "VariableDeclarator") {
			return new DynamicValue(
				ctx.module,
				binding.id,
				`\`${binding.name}\` is a TypeScript import-equals declaration`
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
					let key =
						property.computed ? this.evaluate(property.key, ctx)
						: property.key.type === "Identifier" ? property.key.name
						: String((property.key as { value: unknown }).value)
					if (!isDynamic(key) && isObject(key))
						key = this.coercion(property.key, ctx)
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
					: this.reject(
							pattern,
							ctx,
							"destructures a value other than an array or string by position"
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
			return this.reject(
				node,
				ctx,
				`reads a property of ${object}, which throws`
			)
		}
		if (typeof object === "string") {
			return (
					key === "length" || (typeof key === "string" && /^\d+$/.test(key))
				) ?
					Reflect.get(Object(object), key)
				:	this.notOwnData(node, ctx)
		}
		if (!hasDomain(object, "object")) return this.notOwnData(node, ctx)
		if (this.standIns.has(object)) {
			return this.reject(
				node,
				ctx,
				"reads a property of a function the build does not interpret"
			)
		}
		if (intrinsics.has(object)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(object, key)
			return (
					(descriptor &&
						"value" in descriptor &&
						!hasDomain(descriptor.value, "object")) ||
						pureBuiltins.has(descriptor?.value)
				) ?
					descriptor!.value
				:	this.reject(node, ctx, "is not one of the build's pure built-ins")
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
			return this.reject(
				node,
				ctx,
				"is derived from registry names or node ids, which are not stable"
			)
		}
		const replacedBy = replacementOf(object, key)
		if (replacedBy && ctx.site && ctx.module === ctx.site.module)
			ctx.site.unavailableReads.push({ node, key, replacedBy })
		const value = Reflect.get(object, key)
		const named = this.placeholderIn(value)
		if (named) return this.printsName(node, ctx, named)
		if (
			typeof key === "string" &&
			key in runtimeMembers &&
			hasDomain(value, "object")
		)
			this.validators.add(value)
		const opaque = this.opaqueStandInsByValue.get(object)
		if (opaque && isArkValue(value))
			this.opaqueStandInsByValue.set(value, opaque)
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
			case "package":
				return new DynamicValue(
					ctx.module,
					node,
					target.message,
					undefined,
					target.kind === "package" ? "opaque" : undefined
				)
			case "arktype":
				return target.value
			case "arktypeNamespace":
				this.arkObjects.add(target.value)
				return target.value
			case "binding":
			case "expression": {
				const result = this.exportValue(target)
				if (result.error !== undefined) throw result.error
				if (readsAgain(result.value)) mergeTrace(ctx.trace, result.trace)
				return this.consume(
					{
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
					},
					ctx
				)
			}
		}
		return this.reject(node, ctx, "reads a nested namespace import")
	}

	private notOwnData(node: Node, ctx: Context): DynamicValue {
		return this.reject(node, ctx, "does not read an own data property")
	}

	private evaluateCall(node: CallExpression, ctx: Context): unknown {
		const callee = this.calleeOf(node, ctx)
		if (!("fn" in callee)) return callee
		const { fn, receiver } = callee
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

	private calleeOf(
		node: CallExpression,
		ctx: Context
	): { fn: unknown; receiver: unknown } | DynamicValue | typeof shortCircuit {
		const callee = unwrapExpression(node.callee)
		let receiver: unknown
		let fn: unknown
		if (callee.type === "MemberExpression") {
			receiver = this.consume(this.evaluateReference(callee.object, ctx), ctx)
			this.recordRead(callee.object, receiver, ctx)
			if (receiver === shortCircuit) return shortCircuit
			if (isDynamic(receiver)) return receiver
			if (callee.optional && (receiver === null || receiver === undefined))
				return shortCircuit
			const key = this.keyOf(callee, ctx)
			if (isDynamic(key)) return key
			const kind = receiverKindOf(receiver)
			if (node.optional && (kind || isPlainContainer(receiver))) {
				const method: unknown = Reflect.get(Object(receiver), key)
				if (method === null || method === undefined) return shortCircuit
			}
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
		return { fn, receiver }
	}

	private calleeKindOf(
		fn: unknown,
		receiver: unknown
	): "standIn" | "builtin" | "validator" | "arktype" | undefined {
		if (hasDomain(fn, "object") && this.standIns.has(fn)) return "standIn"
		if (pureBuiltins.has(fn as Function) || receiverKindOf(receiver))
			return "builtin"
		if (typeof fn !== "function" || intrinsics.has(fn)) return
		return isValidator(fn) || this.validators.has(fn) ? "validator" : "arktype"
	}

	call(
		fn: unknown,
		receiver: unknown,
		args: unknown[],
		node: Node,
		ctx: Context
	): unknown {
		if (isDynamic(fn)) return fn
		switch (this.calleeKindOf(fn, receiver)) {
			case "standIn": {
				const standIn = this.standIns.get(fn as object)!
				if (standIn.closure && staticBodyOf(standIn.closure.node))
					return this.interpretCall(standIn.closure, args, node, ctx)
				return this.reject(
					node,
					ctx,
					"calls a function the build does not interpret",
					standIn.closure && this.notStaticHelper(standIn),
					"opaque"
				)
			}
			case "builtin":
				return this.callBuiltin(fn as Function, args, receiver, node, ctx)
			case "validator":
				return this.reject(
					node,
					ctx,
					"validates data, which happens at runtime",
					undefined,
					"validation"
				)
			case "arktype":
				return this.callArktype(fn as Function, args, receiver, node, ctx)
		}
		return this.reject(
			node,
			ctx,
			"does not call a static helper or pure built-in"
		)
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
		const problem =
			(
				builtin?.writes &&
				!(
					node.type === "CallExpression" &&
					node.arguments[0] &&
					/^(Object|Array)Expression$/.test(
						unwrapExpression(node.arguments[0]).type
					)
				)
			) ?
				"writes to an object other than a new object or array literal"
			:	(builtin?.check?.(args, receiver) ??
				(this.convertsObject(builtin, args, receiver) ?
					"converts an object to a primitive, which runs its methods"
				:	undefined))
		if (problem) return this.reject(node, ctx, problem)

		let result: unknown
		const previous = this.activeCall
		this.activeCall = { ctx, isArktype: false }
		try {
			result = Reflect.apply(fn, receiver, args)
		} catch (e) {
			if (e instanceof DynamicValue) return e
			throw this.thrown(e, node, ctx)
		} finally {
			this.activeCall = previous
		}
		const named = this.placeholderIn(result)
		if (named) return this.printsName(node, ctx, named)
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

	private convertsObject(
		builtin: PureBuiltin | undefined,
		args: unknown[],
		receiver: unknown
	): boolean {
		const objects = builtin?.objects ?? []
		for (let i = 0; i < args.length; i++) {
			if (!isObject(args[i])) continue
			const kind = objects[Math.min(i, objects.length - 1)]
			if (
				kind === "object" ||
				(kind === "RegExp" && args[i] instanceof RegExp) ||
				(kind === "callback" && this.standIns.get(args[i] as object)?.closure)
			)
				continue
			return true
		}
		return (
			Array.isArray(receiver) &&
			!builtin?.objectElements &&
			receiver.some(isObject)
		)
	}

	private thrown(
		e: unknown,
		node: Node,
		ctx: Context
	): DynamicValue | ParseError {
		return e instanceof DynamicValue || e instanceof ParseError ?
				e
			:	this.reject(node, ctx, `throws ${String(e)} at build`)
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
		const opaque = this.opaqueStandInOf([receiver, converted])
		const previous = this.activeCall
		this.activeCall = { ctx, isArktype: true }
		try {
			const result = Reflect.apply(fn, receiver, converted)
			const named = this.placeholderIn(result)
			if (named) return this.printsName(node, ctx, named)
			if (isPlainContainer(result)) this.arkObjects.add(result)
			else if (ctx.site && hasArkKind(result, "root"))
				ctx.site.roots.push(result)
			if (opaque && hasDomain(result, "object"))
				this.opaqueStandInsByValue.set(result, opaque)
			return result
		} catch (e) {
			// what arktype throws over a stand-in says nothing of the value it stands in for
			if (opaque && !isDynamic(e)) {
				throw this.reject(
					node,
					ctx,
					`reads the structure of \`${opaque.module.snippetOf(opaque.node)}\`, which is not static`,
					opaque.dynamic
				)
			}
			throw this.thrown(e, node, ctx)
		} finally {
			this.activeCall = previous
		}
	}

	// the opaque value an argument holds, or that arktype built a value from
	private opaqueStandInOf(
		value: unknown,
		seen = new Set<unknown>()
	): StandIn | undefined {
		if (!hasDomain(value, "object") || seen.has(value)) return
		seen.add(value)
		const standIn = this.standIns.get(value)
		if (standIn) return standIn.kind === "opaque" ? standIn : undefined
		const opaque = this.opaqueStandInsByValue.get(value)
		if (opaque || !isPlainContainer(value)) return opaque
		for (const k of Reflect.ownKeys(value)) {
			const result = this.opaqueStandInOf(Reflect.get(value, k), seen)
			if (result) return result
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
		if (ctx.depth > maxDepth)
			return this.reject(node, ctx, "nests static helper calls too deeply")

		const callCtx: Context = {
			...ctx,
			module: closure.module,
			env: createEnvironment(closure.env),
			depth: ctx.depth + 1
		}
		const params = runtimeParamsOf(closure.node)
		for (let i = 0; i < params.length; i++) {
			const param = params[i]
			if (param.type === "RestElement")
				this.destructure(param.argument, args.slice(i), callCtx)
			else this.destructure(param, args[i], callCtx)
		}
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
				(typeof arg === "string" && isIsoInstant(arg)))
		)
			return new Date(arg)
		if (callee === Date) {
			return this.reject(
				node,
				ctx,
				`${
					!args.length ? "reads the clock"
					: typeof arg === "string" ?
						"reads the time zone, or a format each engine parses its own way"
					:	"reads the time zone"
				}`
			)
		}
		return this.reject(
			node,
			ctx,
			"constructs a value other than a Date or RegExp",
			undefined,
			"opaque"
		)
	}

	// a standalone artifact prints a hole's name at creation, so the build names it by a placeholder it can find in what arktype prints
	private holeNameOf(node: Node, module: SourceModule): string {
		return this.opts.runtime === "arktype" ?
				""
			:	`${holeNamePrefix}${hashOf(`${module.path}:${node.start}`)}`
	}

	private functionStandIn(closure: Closure, node: Node): object {
		// the build can evaluate an expression the program runs once more than once, but it must stand in for the same value
		const evaluated = !closure.env && this.standInsByNode.get(closure.node)
		if (evaluated) return evaluated
		const arity = parameterCount(closure.node)
		const name = this.holeNameOf(closure.node, closure.module)
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
		if (name) this.standInsByName.set(name, standIn)
		const proxy = this.standInProxy(target, standIn, {
			get: (target, k) =>
				k === "length" ? arity
				: k === "name" ? name
				: answersFact(k) ? Reflect.get(target, k)
				: this.refuse(standIn),
			getPrototypeOf: target => Reflect.getPrototypeOf(target),
			apply: (_, __, args: unknown[]) => this.callStandIn(standIn, args),
			construct: () => {
				throw this.calledAtDefinition(standIn, undefined)
			}
		})
		if (!closure.env) this.standInsByNode.set(closure.node, proxy)
		return proxy
	}

	private callStandIn(standIn: StandIn, args: unknown[]): unknown {
		const active = this.activeCall
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
		if (isDynamic(converted)) {
			throw converted.hasCode("placeholder") ? converted : (
					this.calledAtDefinition(standIn, converted)
				)
		}
		return converted
	}

	private notStaticHelper(standIn: StandIn): DynamicValue {
		return new DynamicValue(
			standIn.module,
			standIn.node,
			`${this.labelOf(standIn)} is not a static helper: its body is not one expression or one \`return\``
		)
	}

	private calledAtDefinition(
		standIn: StandIn,
		cause: DynamicValue | undefined
	): DynamicValue {
		return new DynamicValue(
			standIn.module,
			standIn.node,
			`arktype calls ${this.labelOf(standIn)} while defining the type, so it must be a static helper`,
			cause ??
				standIn.dynamic ??
				(standIn.closure ? this.notStaticHelper(standIn) : undefined),
			"callback"
		)
	}

	private classStandIn(node: Class, ctx: Context): object {
		const evaluated = !ctx.env && this.standInsByNode.get(node)
		if (evaluated) return evaluated
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
		const length = constructor ? parameterCount(constructor.value) : 0
		const name = this.holeNameOf(node, ctx.module)
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
		if (name) this.standInsByName.set(name, standIn)
		const proxy = this.standInProxy(target, standIn, {
			get: (target, k) =>
				k === "length" ? length
				: k === "name" ? name
				: answersFact(k) ? Reflect.get(target, k)
				: this.refuse(standIn),
			getPrototypeOf: target => Reflect.getPrototypeOf(target),
			apply: () => {
				standIn.isCalled = true
				throw new DynamicValue(
					ctx.module,
					node,
					`arktype calls the class${node.id ? ` \`${node.id.name}\`` : ""} (${ctx.module.positionOf(node)}) as a function, which throws a TypeError`,
					undefined,
					"callback"
				)
			},
			construct: (target, args, newTarget) => {
				standIn.isCalled = true
				if (effect) {
					throw this.calledAtDefinition(
						standIn,
						this.reject(effect, ctx, "runs when the class is constructed")
					)
				}
				return Reflect.construct(target, args, newTarget)
			}
		})
		if (!ctx.env) this.standInsByNode.set(node, proxy)
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
		// arktype may only ask whether an opaque value is a Standard Schema, since anything else it reads decides the type
		return this.standInProxy(class {}, standIn, {
			get: (_, k) => (k === arkKind ? undefined : this.refuse(standIn)),
			has: (_, k) => {
				if (k !== "~standard") this.refuse(standIn)
				standIn.isDefinition = true
				return true
			},
			getPrototypeOf: () => Object.prototype,
			apply: () => {
				standIn.isCalled = true
				throw this.calledAtDefinition(standIn, undefined)
			},
			construct: () => {
				throw this.calledAtDefinition(standIn, undefined)
			}
		})
	}

	// a stand-in answers only what arktype's facts module reads, so a read arktype makes anywhere else is refused
	private standInProxy(
		target: Function,
		standIn: StandIn,
		handler: ProxyHandler<Function>
	): object {
		const refuse = (): never => this.refuse(standIn)
		const proxy = new Proxy(target, {
			apply: refuse,
			construct: refuse,
			defineProperty: refuse,
			deleteProperty: refuse,
			get: refuse,
			getOwnPropertyDescriptor: refuse,
			getPrototypeOf: refuse,
			has: refuse,
			isExtensible: refuse,
			ownKeys: refuse,
			preventExtensions: refuse,
			set: refuse,
			setPrototypeOf: refuse,
			...handler
		})
		this.standIns.set(proxy, standIn)
		return proxy
	}

	// arktype prints a hole's name as its placeholder, so code reading what it prints would see a name the program never does
	private placeholderIn(
		value: unknown,
		seen = new Set<unknown>()
	): StandIn | undefined {
		if (typeof value === "string") {
			for (const name of value.match(holeNamePattern) ?? []) {
				const standIn = this.standInsByName.get(name)
				if (standIn) return standIn
			}
			return
		}
		if (!isPlainContainer(value) || seen.has(value)) return
		seen.add(value)
		for (const k of Reflect.ownKeys(value)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(value, k)!
			const standIn =
				this.placeholderIn(k, seen) ??
				this.placeholderIn(descriptor.value, seen)
			if (standIn) return standIn
		}
	}

	private printsName(node: Node, ctx: Context, named: StandIn): DynamicValue {
		return new DynamicValue(
			ctx.module,
			node,
			`\`${ctx.module.snippetOf(node)}\` (${ctx.module.positionOf(node)}) prints the name of ${this.labelOf(named)}, which the build knows only by a placeholder`,
			undefined,
			"placeholder"
		)
	}

	standInNamed(name: string): StandIn | undefined {
		return this.standInsByName.get(name)
	}

	declaredNameOf(standIn: StandIn): string | undefined {
		return (
			standIn.closure?.name ||
			bindingOfFunction(standIn.node, standIn.module)?.name
		)
	}

	labelOf(standIn: StandIn): string {
		const name = this.declaredNameOf(standIn)
		return `${
			name ? `\`${name}\``
			: standIn.kind === "class" ? "a class"
			: "a function"
		} (${standIn.module.positionOf(standIn.node)})`
	}

	private refuse(standIn: StandIn): never {
		throw new DynamicValue(
			standIn.module,
			standIn.node,
			`arktype reads \`${standIn.module.snippetOf(standIn.node)}\` while defining the type, so it must be static`,
			standIn.dynamic
		)
	}
}

// what a standalone build replaces a value with, if that has no such member
const replacementOf = (
	object: object,
	key: PropertyKey
): UnavailableRead["replacedBy"] | undefined =>
	hasArkKind(object, "root") && !(key in validatorMembers) ? "validator"
	: hasArkKind(object, "scope") ? "Scope"
	: hasArkKind(object, "generic") ? "Generic"
	: undefined

// the facts arktype reads from a function or class by key, besides its name and length
const answersFact = (k: PropertyKey) =>
	k === arkKind || k === "constructor" || k === "prototype" || k === "toJSON"

const isReference = (node: Node) => {
	const { type } = unwrapExpression(node)
	return type === "Identifier" || type === "MemberExpression"
}

export const isDynamic = (value: unknown): value is DynamicValue =>
	value instanceof DynamicValue

// Types, matchers and typed functions run their arguments through validation
export const isValidator = (value: unknown): boolean =>
	hasArkKind(value, "root") || value instanceof InternalTypedFn

// objects other than arktype's, which the program can change after the build reads them, so a site compares what it read from them
const isChangeable = (value: unknown): value is object =>
	isPlainContainer(value) || value instanceof Date || value instanceof RegExp

// a node holds nothing it was made from, but a Generic parses its body at each instantiation and a Scope its aliases when first resolved
const readsAgain = (value: unknown): boolean =>
	hasArkKind(value, "generic") ||
	hasArkKind(value, "scope") ||
	(hasArkKind(value, "module") &&
		Object.values(Object.getOwnPropertyDescriptors(value)).some(
			descriptor => "value" in descriptor && readsAgain(descriptor.value)
		))

export const findDynamic = (
	value: unknown,
	isWanted: (dynamic: DynamicValue) => boolean = () => true,
	seen = new Set<unknown>()
): DynamicValue | undefined => {
	if (isDynamic(value)) return isWanted(value) ? value : undefined
	if (!isPlainContainer(value) || seen.has(value)) return
	seen.add(value)
	for (const k of Reflect.ownKeys(value)) {
		const dynamic = findDynamic(Reflect.get(value, k), isWanted, seen)
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
		(hasDomain(value, "object") && standIns.has(value))
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

const emptyTrace = (): Trace => ({
	reads: [],
	helpers: [],
	exportedFunctions: []
})

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
	for (const read of from.exportedFunctions) into.exportedFunctions.push(read)
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

// a declarator sets each binding once its element of the pattern, default included, has run; a read in the initializer, which runs first, depends on itself
const setAt = (binding: Binding): number => {
	if (binding.declaration.type !== "VariableDeclarator")
		return binding.declaration.end
	let element: Node = binding.id
	for (let parent = element.parent; parent; parent = element.parent) {
		if (
			(parent.type === "AssignmentPattern" && parent.left === element) ||
			parent.type === "RestElement" ||
			(parent.type === "Property" && parent.parent?.type === "ObjectPattern")
		)
			element = parent
		else break
	}
	return element.end
}

const staticProblemOf = (
	binding: Binding,
	module: SourceModule
): string | undefined =>
	binding.kind === "catch" ? "is a caught error"
	: binding.kind === "member" || binding.kind === "namespace" ?
		"is declared in a TypeScript namespace or enum"
	: binding.isAmbient ? "is declared without a value"
	: binding.writes.length ?
		`is ${module.scopes.bindingsById.has(binding.writes[0]) ? "declared again" : "assigned"} at ${module.positionOf(binding.writes[0])}, so its value at the site is not known`
	: module.scopes.hasDirectEval ? "is in a module that calls `eval`"
	: module.scopes.hasWith ? "is in a module that uses `with`"
	: isLoopVariable(binding) ? "is a loop variable"
	: undefined

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
	for (const param of runtimeParamsOf(fn)) {
		if (param.type === "AssignmentPattern" || param.type === "RestElement")
			break
		count++
	}
	return count
}

const inferredNameOf = (fn: FunctionNode): string => {
	const parent = fn.parent
	return (
		fn.id ? fn.id.name
		: parent?.type === "VariableDeclarator" && parent.id.type === "Identifier" ?
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

// every engine reads an ISO date, or a date-time with Z or an offset, as one instant if its fields are in range
const isoYear = String.raw`((?!-0{6})[+-]\d{6}|\d{4})`
const isoMonth = String.raw`(0[1-9]|1[0-2])`
const isoDay = String.raw`(0[1-9]|[12]\d|3[01])`
const isoTime = String.raw`T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{3})?)?`
const isoOffset = String.raw`(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)`

const isoInstant = new RegExp(
	`^${isoYear}(?:-${isoMonth}(?:-${isoDay})?)?(?:${isoTime}${isoOffset})?$`
)

const isIsoInstant = (s: string): boolean => {
	const parts = isoInstant.exec(s)
	if (!parts) return false
	const [, year, month = "01", day = "01"] = parts
	const date = new Date(0)
	date.setUTCFullYear(+year, +month - 1, +day)
	return date.getUTCDate() === +day
}

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
