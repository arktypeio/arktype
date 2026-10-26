import {
	$ark,
	arkKind,
	hasArkKind,
	isNode,
	mergeConfigs,
	ToJsonSchema,
	type BaseNode,
	type BaseRoot,
	type CacheReach
} from "@ark/schema"
import { hasDomain, ParseError } from "@ark/util"
import { configure } from "arktype"
import { InternalTypedFn } from "arktype/internal/fn.ts"
import { InternalChainedMatchParser } from "arktype/internal/match.ts"
import {
	holeNamePattern,
	keyOf,
	type DefaultCheck,
	type FoldedMember,
	type StandaloneIntrospection,
	type ScopeAlias
} from "arktype/internal/standalone.ts"
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
	conversionProblem,
	isArkValue,
	isPlainContainer,
	methodsByReceiverKind,
	pureBuiltins,
	pureConstructors,
	type MethodReceiverKind,
	type PlainContainer,
	type PureBuiltin
} from "./builtins.ts"
import { DynamicValue, type DynamicCode } from "./dynamic.ts"
import { declaredNameOf, holeNameOf } from "./holeNames.ts"
import {
	bindingOfFunction,
	contains,
	enclosingFunctionOf,
	genericMembers,
	importsValues,
	isCallableBeforeBody,
	isOnlyType,
	isTypeOnlyMember,
	isSetLast,
	isIntrospectedProperty,
	isValidatorMember,
	memberNameOf,
	nodeMembers,
	scopeMembers,
	isFunctionNode,
	readsBindingOf,
	runtimeMembers,
	unstableArkMembers,
	staticBodyOf,
	staticConstsOf,
	unstaticStatementOf,
	validatorMembers,
	type FunctionNode,
	type ImportTarget,
	type ModuleGraph
} from "./graph.ts"
import type { SourceModule } from "./module.ts"
import {
	isTransparent,
	unwrapChain,
	operatorOf,
	runtimeParamsOf,
	unwrapExpression,
	walk,
	type Binding
} from "./scope.ts"

export interface InterpreterOptions {
	// ship arktype, precompiling only the code it compiles
	runtime?: "arktype" | undefined
}

type InputRoot =
	| {
			kind: "export"
			file: string
			name: string
			// the module importing it from its declaring module, not a re-export
			importer?: SourceModule | undefined
	  }
	| { kind: "binding"; module: SourceModule; binding: Binding }

export interface Read {
	root: InputRoot
	path: PropertyKey[]
	value: unknown
}

export interface Trace {
	reads: Read[]
	// each function the build interprets a call to
	helpers: [FunctionNode, SourceModule][]
	// each function read from another module's export, which a mock can replace
	exportedFunctions: Read[]
	// each top-level binding the site can read before it's set, and its reader
	readFirst: [binding: Binding, module: SourceModule, reader: string][]
}

interface Environment {
	valuesByBinding: Map<Binding, unknown>
	read: Set<Binding>
	parent: Environment | undefined
}

interface Closure {
	node: FunctionNode
	module: SourceModule
	env: Environment | undefined
	name: string
}

interface StandIn {
	kind: "function" | "class" | "opaque"
	module: SourceModule
	node: Node
	closure: Closure | undefined
	dynamic: DynamicValue | undefined
	// the parameter count arktype reads as `length`, if a declaration gives it
	arity: number | undefined
	isCalled: boolean
	// by code arktype runs while defining a type, like a description writer
	isCalledIndirectly: boolean
	isDefinition: boolean
}

const createStandIn = (
	kind: StandIn["kind"],
	module: SourceModule,
	node: Node,
	init?: Partial<StandIn>
): StandIn => ({
	kind,
	module,
	node,
	closure: undefined,
	dynamic: undefined,
	arity: undefined,
	isCalled: false,
	isCalledIndirectly: false,
	isDefinition: false,
	...init
})

type Reached = DefaultCheck | ScopeAlias

export interface SiteState {
	node: Node
	module: SourceModule
	trace: Trace
	// each outermost expression evaluating to a hole or a Type the site reads
	readsByValue: Map<unknown, Node[]>
	// reads of members a standalone validator lacks
	unavailableReads: Node[]
	holes: unknown[]
	interpreted: Set<Node>
	// each call into arktype's API
	requests: [Node, SourceModule][]
	// each value passed to arktype, whose holes a ParseError can print
	arktypeArguments: unknown[]
	// default checks and Scope aliases reached, in order
	reached: Reached[]
	// each Type a request returned
	roots: BaseRoot[]
	// e.g. `User` and "json" for `User.json`, which a standalone build folds
	introspection:
		| Pick<StandaloneIntrospection, "member" | "type" | "thrown">
		| undefined
	value: unknown
	error: DynamicValue | ParseError | undefined
	isEvaluated: boolean
	// e.g. finding which object a write targets, where an object the program
	// writes still reads as its literal
	readsLiterals: boolean
}

export const createSiteState = (
	node: Node,
	module: SourceModule,
	readsLiterals = false
): SiteState => ({
	node,
	module,
	trace: emptyTrace(),
	readsByValue: new Map(),
	unavailableReads: [],
	holes: [],
	interpreted: new Set(),
	requests: [],
	arktypeArguments: [],
	reached: [],
	roots: [],
	introspection: undefined,
	value: undefined,
	error: undefined,
	isEvaluated: false,
	readsLiterals
})

export interface Context {
	module: SourceModule
	env: Environment | undefined
	trace: Trace
	site: SiteState | undefined
	// the site or declaration being evaluated
	origin: { module: SourceModule; node: Node } | undefined
	depth: number
}

interface Lookup {
	value: unknown
	read?: Read
}

// a value read whole off its root
const lookupOf = (root: InputRoot, value: unknown): Lookup => ({
	value,
	read: { root, path: [], value }
})

const exportRootOf = (
	target: Extract<ImportTarget, { kind: "binding" | "expression" }>,
	importer?: SourceModule
): InputRoot => ({
	kind: "export",
	file: target.module.id,
	name: target.kind === "binding" ? target.name : "default",
	importer
})

interface Evaluated {
	value: unknown
	trace: Trace
	error?: unknown
}

export class ModuleNamespace {
	module: SourceModule

	constructor(module: SourceModule) {
		this.module = module
	}
}

const shortCircuit = { shortCircuit: true }

const maxDepth = 64

const unstableArkProblem =
	"is derived from registry names or node ids, which are not stable"

const printedNameProblem = (label: string) =>
	`prints the name of ${label}, which the build knows only by a placeholder`

const receivedNameProblem = (label: string) =>
	`receives the name of ${label}, which the build knows only by a placeholder`

const outsideContentProblem =
	"is not a documented member its content alone decides, so it can depend on registry names or node ids"

// e.g. `T.json` at its own site, folded unless it prints a registry name
const isIntrospectionRead = (
	object: unknown,
	key: PropertyKey,
	node: Node,
	site: SiteState | undefined
): boolean =>
	hasArkKind(object, "root") &&
	!!site &&
	(isIntrospectedProperty(key) ?
		site.node === node
	:	(key === "toJSON" || key === "toJsonSchema") &&
		site.node.type === "CallExpression" &&
		unwrapChain(site.node.callee) === node)

// e.g. `in` off a Type, or any member of a Scope or Generic
const lacksMember = (object: unknown, key: PropertyKey): boolean =>
	hasArkKind(object, "root") ?
		!(key in validatorMembers)
	:	hasArkKind(object, "scope") || hasArkKind(object, "generic")

// an alias's reference is the node id of what it resolves to
const holdsNodeId = (node: BaseNode, key: string) =>
	node.hasKind("alias") && (key === "reference" || key === "inner")

export class Interpreter {
	private graph: ModuleGraph
	private opts: InterpreterOptions
	sitesByNode = new Map<Node, SiteState>()
	standIns = new WeakMap<object, StandIn>()
	// the site whose own call into arktype threw each ParseError
	parseErrorSites = new WeakMap<ParseError, SiteState>()
	// deferred default checks by the node whose creation ran them
	private checksByOwner = new Map<object, DefaultCheck[]>()
	// what computing each cache entry reached, by cache and key
	private reachedByEntry = new WeakMap<object, Map<unknown, Set<Reached>>>()
	private aliasesByScope = new WeakMap<object, Map<string, ScopeAlias>>()
	// the definitions each Scope was created from
	definitionsByScope = new WeakMap<object, unknown>()
	sourcesBySymbol = new Map<symbol, [Node, SourceModule]>()
	// values reused by every evaluation of the expression creating them
	private standInsByNode = new Map<Node, object>()
	private symbolsByNode = new Map<Node, symbol>()
	private configurationsByNode = new Map<Node, unknown>()
	private valuesByBinding = new Map<Binding, Evaluated | "evaluating">()
	private valuesByNode = new Map<Node, Evaluated>()
	// unknown values a declaration computes at runtime however a site uses them
	private declaredDynamics = new WeakSet<DynamicValue>()
	private dynamicFree = new WeakSet<object>()
	// a site reading one receives it, so its declaration runs
	private comparedAtCreation = new WeakSet<object>()
	// a site reading only introspection of one checked at creation receives it
	private checksByValue = new WeakMap<object, boolean>()
	private modulesByValue = new WeakMap<object, SourceModule[]>()
	private opaqueByDynamic = new WeakMap<DynamicValue, object>()
	private validators = new WeakSet<object>()
	private arkObjects = new WeakSet<object>()
	private opaqueStandInsByValue = new WeakMap<object, StandIn>()
	private admitted = new WeakSet<object>()
	standInsByName = new Map<string, StandIn>()
	// whether arktype made the innermost native call, and whether any
	private activeCall:
		| { ctx: Context; isArktype: boolean; isDefining: boolean }
		| undefined
	// the trace of stand-ins arktype calls outside a site
	private looseTrace: Trace | undefined

	private registerSites: ((module: SourceModule) => unknown) | undefined

	constructor(
		graph: ModuleGraph,
		opts: InterpreterOptions = {},
		registerSites?: (module: SourceModule) => unknown
	) {
		this.graph = graph
		this.opts = opts
		this.registerSites = registerSites
	}

	// each hole arktype could print from a value
	holesIn(
		value: unknown,
		holes = new Set<unknown>(),
		seen = new Set<unknown>()
	): Set<unknown> {
		if (seen.has(value)) return holes
		seen.add(value)
		if (
			typeof value === "symbol" ||
			(hasDomain(value, "object") && this.standIns.has(value))
		)
			holes.add(value)
		else if (hasArkKind(value, "root")) {
			for (const hole of keyOf(value)[1]) {
				if (typeof hole === "symbol" || this.standIns.has(hole as object))
					holes.add(hole)
			}
		} else {
			const held =
				hasArkKind(value, "module") ? Object.values(value)
				: hasArkKind(value, "scope") ? Object.values(value.aliases)
				: hasArkKind(value, "generic") ?
					[value.paramDefs, value.bodyDef, value.$]
				: isPlainContainer(value) ?
					Reflect.ownKeys(value).flatMap(k => [k, Reflect.get(value, k)])
				:	[]
			for (const child of held) this.holesIn(child, holes, seen)
		}
		return holes
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

	private evaluate(node: Node, ctx: Context): unknown {
		const site = ctx.env ? undefined : this.sitesByNode.get(node)
		// a definition nested in the site is part of it
		if (
			site &&
			site !== ctx.site &&
			!(ctx.site?.module === site.module && contains(ctx.site.node, node))
		) {
			this.evaluateSite(site)
			mergeTrace(ctx.trace, site.trace)
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
				// a Type, Module, Scope or Generic the site reads, received by its factory
				(isReference(node) &&
					(hasArkKind(value, "root") ||
						hasArkKind(value, "scope") ||
						hasArkKind(value, "generic") ||
						// e.g. `M` but not `M.a`, whose Type is received instead
						(hasArkKind(value, "module") && !isMemberObject(node))))
			) ||
			!this.isPassable(node, ctx.site)
		)
			return
		// an expression is evaluated after those it contains, so it replaces them
		const reads = (ctx.site.readsByValue.get(value) ?? []).filter(
			read => !contains(node, read)
		)
		if (!reads.some(read => contains(read, node))) reads.push(node)
		ctx.site.readsByValue.set(value, reads)
	}

	// a factory receives a read as its text, which must evaluate alike there
	private isPassable(node: Node, site: SiteState): boolean {
		if (
			site.unavailableReads.some(read => contains(node, read)) ||
			readsBindingOf(site.node, node, site.module)
		)
			return false
		let readsOuterThis = false
		walk(node, child => {
			if (child.type === "ThisExpression") {
				let owner: Node = child
				while (owner !== node && !bindsThis(owner)) owner = owner.parent!
				if (!bindsThis(owner)) readsOuterThis = true
			}
			return !readsOuterThis
		})
		return !readsOuterThis
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
				const copy = this.admit({ ...(spread as object) }, property, ctx)
				if (isDynamic(copy)) return copy
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

	// a site dropping an unknown value would drop its computation too
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
				this.reject(
					node,
					ctx,
					"is approximated by each engine unless its operands are integers with a safe integer result"
				)
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
		return this.reject(node, ctx, conversionProblem)
	}

	private evaluateReference(node: Node, ctx: Context): Lookup {
		node = unwrapExpression(node)
		if (node.type === "Identifier")
			return this.readIdentifier(node as IdentifierReference, ctx)
		if (node.type !== "MemberExpression")
			return { value: this.evaluate(node, ctx) }
		const base = this.evaluateReference(node.object, ctx)
		if (base.value === shortCircuit || isDynamic(base.value)) return base
		// e.g. `$` in `$.type.or("a", "b")`
		if (
			hasArkKind(base.value, "root") ||
			hasArkKind(base.value, "scope") ||
			hasArkKind(base.value, "generic")
		)
			this.recordRead(node.object, base.value, ctx)
		const dynamic = findDynamic(base.value)
		if (dynamic) return { value: dynamic.asOperand() }
		if (node.optional && (base.value === null || base.value === undefined))
			return { value: shortCircuit }
		const key = this.keyOf(node, ctx)
		if (isDynamic(key)) return { value: key }
		const value = this.readMember(base.value, key, node, ctx)
		if (!base.read) return { value }
		// a read stops at a Type whose validator lacks the member
		if (
			base.read.value !== base.value ||
			(lacksMember(base.value, key) &&
				((hasArkKind(base.value, "root") && isTypeOnlyMember(key)) ||
					this.isReadThrough(ctx.site)))
		)
			return { value, read: base.read }
		return {
			value,
			read: { root: base.read.root, path: [...base.read.path, key], value }
		}
	}

	// e.g. `T.in.json`, but not a bare `T.internal`
	private isReadThrough(site: SiteState | undefined): boolean {
		if (!site) return false
		const { node, module } = site
		const callee = node.type === "CallExpression" && unwrapChain(node.callee)
		const [operand, parent] = operatorOf(node)
		return (
			(node.type === "MemberExpression" ?
				isIntrospectedProperty(memberNameOf(node))
			:	callee &&
				callee.type === "MemberExpression" &&
				(memberNameOf(callee) === "toJSON" ||
					memberNameOf(callee) === "toJsonSchema")) ||
			isOnlyType(this.graph.kindOf(node, module)) ||
			(parent?.type === "MemberExpression" &&
				parent.object === operand &&
				isValidatorMember(memberNameOf(parent)))
		)
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
		// a declared function is read from a binding only where it may be unset
		if (
			!(hasDomain(value, "object") && this.standIns.has(value)) ||
			(read.root.kind === "binding" && !read.path.length)
		)
			ctx.trace.reads.push(read)
		else if (read.root.kind === "export" && !read.path.length)
			ctx.trace.exportedFunctions.push(read)
		return value
	}

	private readIdentifier(node: IdentifierReference, ctx: Context): Lookup {
		const binding = ctx.module.scopes.refsById.get(node)?.binding
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
			if (env.valuesByBinding.has(binding)) {
				env.read.add(binding)
				return { value: env.valuesByBinding.get(binding) }
			}
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
		const problem = staticProblemOf(binding, module)
		if (problem) {
			return {
				value: new DynamicValue(module, node, `\`${binding.name}\` ${problem}`)
			}
		}
		const isForeign = !!ctx.origin && ctx.origin.module !== module
		// e.g. through a function another module calls
		const readAt =
			isForeign ? node
			: ctx.origin && contains(binding.scope.node, ctx.origin.node) ?
				ctx.origin.node
			:	undefined
		const isReadFirst =
			!!readAt &&
			binding.kind !== "function" &&
			readsFirst(readAt, binding, module)
		const result = this.bindingValue(binding, module)
		if (result.error !== undefined) throw result.error
		// `V ?? x` reads an unset `var` without throwing
		if (
			isReadFirst &&
			binding.kind === "var" &&
			!(isArkValue(result.value) && throwsUnset(node))
		) {
			return {
				value: new DynamicValue(
					module,
					node,
					`\`${binding.name}\` can be read before its declaration (${module.positionOf(binding.id)})`
				)
			}
		}
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
		const written =
			isChangeable(result.value) &&
			this.writtenBefore(binding, module, readAt ?? node, ctx)
		if (written) return { value: new DynamicValue(module, node, written) }
		let isReceived = isChangeable(result.value)
		if (!isArkValue(result.value) || readsAgain(result.value))
			mergeTrace(ctx.trace, result.trace)
		else {
			// arktype values are immutable, so their reads hold at the site
			for (const read of result.trace.reads)
				if (isArkValue(read.value)) ctx.trace.reads.push(read)
			// unless the declaration compares what the program holds
			isReceived = this.comparedAtCreation.has(result.value as object)
		}
		// a binding read before it's set is received, so its factory throws alike
		const isChecked =
			isReadFirst &&
			binding.scope.node === module.program &&
			(isForeign || isSetLast(binding))
		if (isChecked) {
			const reader = enclosingFunctionOf(node)
			ctx.trace.readFirst.push([
				binding,
				module,
				reader ? inferredNameOf(reader) || module.snippetOf(reader) : ""
			])
		}
		return isReceived || (isReadFirst && !isChecked) ?
				lookupOf({ kind: "binding", module, binding }, result.value)
			:	{ value: result.value }
	}

	valueOfBinding(binding: Binding, module: SourceModule): unknown {
		if (binding.kind !== "import")
			return this.bindingValue(binding, module).value
		const target = this.graph.importOf(binding, module)
		return (
			target.kind === "binding" ?
				this.bindingValue(target.binding, target.module).value
			: target.kind === "expression" ? this.exportValue(target).value
			: target.kind === "arktype" ? target.value
			: undefined
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
				return lookupOf(
					{ kind: "export", file: target.id, name: "default" },
					target.value
				)
		}
		const result = this.exportValue(target)
		if (result.error !== undefined) throw result.error
		const exported =
			isChangeable(result.value) &&
			target.kind === "binding" &&
			this.writtenIn(target.binding, target.module, ctx)
		const dynamic =
			isDynamic(result.value) ?
				result.value
			:	exported && new DynamicValue(target.module, target.binding.id, exported)
		if (dynamic) {
			return {
				value: new DynamicValue(
					ctx.module,
					node,
					`\`${binding.name}\` is imported from ${target.module.path}`,
					dynamic
				)
			}
		}
		const written =
			isChangeable(result.value) &&
			this.writtenBefore(
				binding,
				ctx.module,
				ctx.origin?.module === ctx.module ? ctx.origin.node : node,
				ctx
			)
		if (written) return { value: new DynamicValue(ctx.module, node, written) }
		if (readsAgain(result.value)) mergeTrace(ctx.trace, result.trace)
		const declaration = binding.declaration.parent
		const isDirect =
			declaration?.type === "ImportDeclaration" &&
			this.graph.resolve(declaration.source.value, ctx.module) === target.module
		return lookupOf(
			exportRootOf(target, isDirect ? ctx.module : undefined),
			result.value
		)
	}

	// an export is static only if its own module could not change it
	exportValue(
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

	// e.g. `shape[f] = "string"` before `type(shape)`, changing an object the
	// build reads as its literal. A write inside the read is evaluated with it
	private writtenBefore(
		binding: Binding,
		module: SourceModule,
		readAt: Node,
		ctx: Context
	): string | undefined {
		if (ctx.site?.readsLiterals) return
		const scope = binding.scope.node
		const isReadOnce = runsOnceIn(readAt, scope)
		const write = this.graph
			.writesThrough(binding, module)
			.find(
				write => !isReadOnce || runPointOf(write, scope, module) < readAt.start
			)
		return write && writtenProblemOf(binding, write, module)
	}

	// an export its module writes, which it has by the time an importer reads it
	private writtenIn(
		binding: Binding,
		module: SourceModule,
		ctx: Context
	): string | undefined {
		if (ctx.site?.readsLiterals) return
		const [write] = this.graph.writesThrough(binding, module)
		return write && writtenProblemOf(binding, write, module)
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
		this.registerSites?.(module)
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
		this.markDeclared(
			result,
			declaration.type === "VariableDeclarator" ? declaration.init : undefined,
			module
		)
		this.valuesByBinding.set(binding, result)
		return result
	}

	private markDeclared(
		{ value, trace }: Evaluated,
		init: Node | null | undefined,
		module: SourceModule
	): void {
		findDynamic(value, dynamic => {
			this.declaredDynamics.add(dynamic)
			return false
		})
		if (!isArkValue(value)) return
		const site =
			init ?
				(this.sitesByNode.get(init) ??
				this.sitesByNode.get(unwrapExpression(init)))
			:	undefined
		const compares = trace.reads.some(
			read => read.root.kind === "binding" || !isArkValue(read.value)
		)
		if (compares) this.comparedAtCreation.add(value as object)
		// a default's check calls the functions it reads at creation
		const checks =
			compares ||
			!!site?.reached.some(reached => reached.length === 3) ||
			this.checksHolesOf(value, site, module)
		const values = [value]
		// e.g. a Module's Types, which its creation created
		for (const value of values) {
			// one value can be declared more than once, as by an alias
			if (!this.checksByValue.get(value as object))
				this.checksByValue.set(value as object, checks)
			const modules = this.modulesByValue.get(value as object)
			if (!modules) this.modulesByValue.set(value as object, [module])
			else if (!modules.includes(module)) modules.push(module)
			if (hasArkKind(value, "module")) values.push(...Object.values(value))
		}
	}

	modulesDeclaring(value: unknown): readonly SourceModule[] {
		return this.modulesByValue.get(value as object) ?? []
	}

	private checksHolesOf(
		value: unknown,
		site: SiteState | undefined,
		module: SourceModule
	): boolean {
		try {
			// with what arktype was passed but doesn't hold
			return [...this.holesIn(value), ...(site?.holes ?? [])].some(hole =>
				this.checksHole(site, hole, module)
			)
		} catch (e) {
			// e.g. a Scope configured by a parameter, which the build can't key
			if (e instanceof DynamicValue) return true
			throw e
		}
	}

	// a value whose creation the build didn't see may check anything
	isCheckedAtCreation(value: unknown): boolean {
		return this.checksByValue.get(value as object) ?? true
	}

	// unless a site reads it as its module's own or through an unchecked Type
	private checksHole(
		site: SiteState | undefined,
		hole: unknown,
		module: SourceModule
	): boolean {
		if (!site) return true
		const reads = site.readsByValue.get(hole)
		if (reads) return !reads.every(read => this.isOwnHole(read, hole, module))
		for (const value of site.readsByValue.keys()) {
			if (
				isArkValue(value) &&
				!this.isCheckedAtCreation(value) &&
				this.holesIn(value).has(hole)
			)
				return false
		}
		return true
	}

	// one its module creates where the site reads it
	isOwnHole(read: Node, value: unknown, module: SourceModule): boolean {
		const [source, origin] = this.sourceOf(value) ?? []
		if (
			origin !== module ||
			!(typeof value === "symbol" ?
				// e.g. `Symbol("tag")`, whose description no read changes
				source!.type === "CallExpression" &&
				source!.arguments.every(
					arg => arg.type === "Literal" && typeof arg.value === "string"
				)
			:	this.standIns.get(value as object)!.kind === "function")
		)
			return false
		const node = unwrapExpression(read)
		if (node === source) return true
		const binding =
			node.type === "Identifier" ?
				module.scopes.refsById.get(node)?.binding
			:	undefined
		if (!binding || binding.writes.length) return false
		const { declaration } = binding
		return binding.kind === "function" ?
				declaration === source
			:	(binding.kind === "const" ||
					binding.kind === "let" ||
					binding.kind === "var") &&
					declaration.type === "VariableDeclarator" &&
					declaration.id === binding.id &&
					!!declaration.init &&
					unwrapExpression(declaration.init) === source
	}

	private nodeValue(node: Node, module: SourceModule): Evaluated {
		let result = this.valuesByNode.get(node)
		if (result) return result
		this.registerSites?.(module)
		const ctx = rootContext(module, node)
		try {
			result = { value: this.evaluate(node, ctx), trace: ctx.trace }
		} catch (e) {
			result = { value: undefined, trace: ctx.trace, error: e }
		}
		this.markDeclared(result, node, module)
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
							isDynamic(value) ? value
							: isPlainContainer(value) ? restOf(value, used)
							: this.reject(
									property,
									ctx,
									"copies the rest of a value other than an object literal"
								),
							ctx
						)
						continue
					}
					let key =
						property.computed ? this.evaluate(property.key, ctx)
						: property.key.type === "Identifier" ? property.key.name
						: String((property.key as { value: unknown }).value)
					if (!isDynamic(key) && hasDomain(key, "object"))
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

	private readMember(
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
				if (!("value" in descriptor)) return this.notOwnData(node, ctx)
				// e.g. `validate` off `T["~standard"]`, which validates data at runtime
				if (
					this.validators.has(object) &&
					typeof descriptor.value === "function"
				)
					this.validators.add(descriptor.value)
				return descriptor.value
			}
			return key in object ? this.notOwnData(node, ctx) : undefined
		}
		if (object instanceof Date || object instanceof RegExp)
			return this.notOwnData(node, ctx)
		// a member the validator lacks makes the site its own
		if (
			ctx.site &&
			ctx.module === ctx.site.module &&
			key in object &&
			lacksMember(object, key)
		)
			ctx.site.unavailableReads.push(node)
		const members =
			isNode(object) ? nodeMembers
			: hasArkKind(object, "scope") ? scopeMembers
			: hasArkKind(object, "generic") ? genericMembers
			: undefined
		const isIntrospected = isIntrospectionRead(object, key, node, ctx.site)
		if (isIntrospected) {
			ctx.site!.introspection = {
				member: key as FoldedMember,
				type: object as BaseRoot
			}
		} else if (members) {
			// other members can depend on the order arktype created things
			if (
				typeof key !== "string" ||
				(isNode(object) && holdsNodeId(object, key)) ||
				!(
					key in members ||
					(isNode(object) &&
						Object.prototype.hasOwnProperty.call(object.inner, key))
				)
			)
				return this.reject(node, ctx, outsideContentProblem)
		} else if (
			typeof key === "string" &&
			key in unstableArkMembers &&
			!hasArkKind(object, "module")
		)
			return this.reject(node, ctx, unstableArkProblem)
		// a getter is a call into arktype, which can throw a ParseError
		ctx.site?.arktypeArguments.push(object)
		let read
		try {
			read = Reflect.get(object, key)
		} catch (e) {
			this.claimParseError(e, ctx)
			throw e
		}
		// prints the names of the functions its factory receives
		const value =
			isIntrospected && key !== "json" ? read : this.admit(read, node, ctx)
		if (isDynamic(value)) return value
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
				const written =
					isChangeable(result.value) &&
					target.kind === "binding" &&
					this.writtenIn(target.binding, target.module, ctx)
				if (written) return new DynamicValue(target.module, node, written)
				if (readsAgain(result.value)) mergeTrace(ctx.trace, result.trace)
				return this.consume(lookupOf(exportRootOf(target), result.value), ctx)
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

	private call(
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
				if (this.activeCall?.isDefining) standIn.isCalledIndirectly = true
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
				return this.callNative(fn as Function, args, receiver, node, ctx)
			case "validator":
				return this.reject(
					node,
					ctx,
					"validates data, which happens at runtime",
					undefined,
					"validation"
				)
			case "arktype":
				if (fn !== configure)
					return this.callArktype(fn as Function, args, receiver, node, ctx)
				// e.g. in a helper, which a precompiled call no longer runs
				return ctx.env ?
						this.reject(
							node,
							ctx,
							"configures arktype as the function runs, which a call the build precompiles doesn't"
						)
					:	this.configurationOf(node, args[0], ctx)
		}
		return this.reject(
			node,
			ctx,
			"does not call a static helper or pure built-in"
		)
	}

	// what configure() returns: its configuration merged with what it receives
	configurationOf(call: Node, received: unknown, ctx?: Context): unknown {
		const cached = !ctx?.env && this.configurationsByNode.get(call)
		if (cached) return cached
		const result = findDynamic(received) ?? mergeConfigs({}, received as never)
		if (!ctx?.env) this.configurationsByNode.set(call, result)
		return result
	}

	// the one path from interpreted to native code
	private callNative(
		fn: Function,
		args: unknown[],
		receiver: unknown,
		node: Node,
		ctx: Context,
		isNew = false
	): unknown {
		const dynamic = findDynamic([receiver, ...args])
		if (dynamic) return dynamic
		// esbuild's keepNames under tsx
		if (fn === Object.defineProperty && !isNew && this.isNaming(args, ctx))
			return args[0]
		const builtin = (isNew ? pureConstructors : pureBuiltins).get(fn)
		if (!builtin) {
			return isNew ?
					this.reject(
						node,
						ctx,
						"constructs a value other than a Date or RegExp",
						undefined,
						"opaque"
					)
				:	this.reject(
						node,
						ctx,
						"does not call a static helper or pure built-in"
					)
		}
		const problem =
			(
				builtin.writes &&
				!(
					node.type === "CallExpression" &&
					node.arguments[0] &&
					/^(Object|Array)Expression$/.test(
						unwrapExpression(node.arguments[0]).type
					)
				)
			) ?
				"writes to an object other than a new object or array literal"
			:	(builtin.check?.(args, receiver) ??
				this.conversionOf(builtin, args, receiver))
		if (problem) return this.reject(node, ctx, problem)
		let result: unknown
		const previous = this.activeCall
		this.activeCall = {
			ctx,
			isArktype: false,
			isDefining: !!previous?.isDefining
		}
		try {
			result =
				isNew ? Reflect.construct(fn, args) : Reflect.apply(fn, receiver, args)
		} catch (e) {
			if (e instanceof DynamicValue) return e
			throw this.thrown(e, node, ctx)
		} finally {
			this.activeCall = previous
		}
		return this.admit(result, node, ctx)
	}

	private isNaming(
		[target, key, descriptor]: unknown[],
		ctx: Context
	): boolean {
		const standIn =
			hasDomain(target, "object") ? this.standIns.get(target) : undefined
		return (
			standIn?.kind === "function" &&
			standIn.module === ctx.module &&
			key === "name" &&
			isPlainContainer(descriptor) &&
			Reflect.ownKeys(descriptor).length === 2 &&
			typeof Reflect.get(descriptor, "value") === "string" &&
			Reflect.get(descriptor, "configurable") === true
		)
	}

	private conversionOf(
		builtin: PureBuiltin,
		args: unknown[],
		receiver: unknown
	): string | undefined {
		const objects = builtin.objects ?? []
		for (let i = 0; i < args.length; i++) {
			if (!hasDomain(args[i], "object")) continue
			const kind = objects[Math.min(i, objects.length - 1)]
			if (
				kind === "object" ||
				(kind === "RegExp" && args[i] instanceof RegExp) ||
				(kind === "callback" && this.standIns.get(args[i] as object)?.closure)
			)
				continue
			return conversionProblem
		}
		if (
			Array.isArray(receiver) &&
			!builtin.objectElements &&
			receiver.some(element => hasDomain(element, "object"))
		)
			return conversionProblem
	}

	private claimParseError(e: unknown, ctx: Context): void {
		if (e instanceof ParseError && ctx.site && !this.parseErrorSites.has(e))
			this.parseErrorSites.set(e, ctx.site)
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
		if (ctx.site) {
			collectHoles(converted, ctx.site.holes, this.standIns)
			ctx.site.arktypeArguments.push(receiver, ...converted)
		}
		const opaque = this.opaqueStandInOf([receiver, converted])
		const previous = this.activeCall
		const previousDefer = $ark.deferDefaultCheck
		const previousReached = $ark.reached
		this.activeCall = { ctx, isArktype: true, isDefining: true }
		$ark.deferDefaultCheck = this.deferDefaultCheck
		$ark.reached = this.reached
		try {
			const result = this.admit(
				Reflect.apply(fn, receiver, converted),
				node,
				ctx
			)
			if (isDynamic(result)) return result
			if (isPlainContainer(result)) this.arkObjects.add(result)
			else if (ctx.site && hasArkKind(result, "root"))
				ctx.site.roots.push(result)
			else if (
				hasArkKind(result, "scope") &&
				!this.definitionsByScope.has(result)
			)
				this.definitionsByScope.set(result, converted[0])
			if (opaque && hasDomain(result, "object"))
				this.opaqueStandInsByValue.set(result, opaque)
			return result
		} catch (e) {
			// what arktype throws over a stand-in says nothing of its value
			if (opaque && !isDynamic(e)) {
				throw this.reject(
					node,
					ctx,
					`reads the structure of \`${opaque.module.snippetOf(opaque.node)}\`, which is not static`,
					opaque.dynamic
				)
			}
			const introspection = ctx.site?.node === node && ctx.site.introspection
			// a JSON Schema arktype can't write throws at each call instead
			if (
				introspection &&
				introspection.member === "toJsonSchema" &&
				this.opts.runtime !== "arktype" &&
				e instanceof ToJsonSchema.Error &&
				e.message.search(holeNamePattern) === -1
			) {
				introspection.thrown = e
				return
			}
			this.claimParseError(e, ctx)
			throw this.thrown(e, node, ctx)
		} finally {
			this.activeCall = previous
			$ark.deferDefaultCheck = previousDefer
			$ark.reached = previousReached
		}
	}

	private deferDefaultCheck = (
		node: BaseRoot,
		value: unknown,
		key: PropertyKey | null,
		owner: BaseNode | undefined
	): boolean => {
		const site = this.activeCall?.ctx.site
		if (!site || !this.holdsStandIn(node.in as BaseRoot)) return false
		const check: DefaultCheck = [node, value, key]
		site.reached.push(check)
		if (owner) {
			let checks = this.checksByOwner.get(owner)
			if (!checks) this.checksByOwner.set(owner, (checks = []))
			checks.push(check)
		}
		return true
	}

	private reached: CacheReach = {
		node: node => {
			const checks = this.checksByOwner.get(node)
			if (checks) this.activeCall?.ctx.site?.reached.push(...checks)
		},
		cached: (cache, key) => {
			const site = this.activeCall?.ctx.site
			for (const reached of this.reachedByEntry.get(cache)?.get(key) ?? [])
				site?.reached.push(reached)
		},
		alias: ($, alias) => {
			// one tuple per alias, so an entry computed again stores each alias once
			let aliases = this.aliasesByScope.get($)
			if (!aliases) this.aliasesByScope.set($, (aliases = new Map()))
			let reached = aliases.get(alias)
			if (!reached) aliases.set(alias, (reached = [$, alias]))
			this.activeCall?.ctx.site?.reached.push(reached)
		},
		mark: () => this.activeCall?.ctx.site?.reached.length,
		// an entry computed again reaches what each computation did
		store: (mark, cache, key) => {
			const reached = this.activeCall?.ctx.site?.reached
			if (mark === undefined || !reached || reached.length === mark) return
			let entries = this.reachedByEntry.get(cache)
			if (!entries) this.reachedByEntry.set(cache, (entries = new Map()))
			let stored = entries.get(key)
			if (!stored) entries.set(key, (stored = new Set()))
			for (let i = mark; i < reached.length; i++) stored.add(reached[i])
		}
	}

	// e.g. a narrow or a writer, which checking a default would call
	private holdsStandIn(root: BaseRoot): boolean {
		return [root, ...root.references].some(node =>
			[
				...(node.hasKind("predicate") ? [node.predicate] : []),
				...Object.values(node.meta)
			].some(value => typeof value === "function" && this.standIns.has(value))
		)
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

	private toArktype(value: unknown): unknown {
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
		addHelper(ctx.trace.helpers, closure.node, closure.module)
		if (ctx.site && closure.module === ctx.site.module)
			ctx.site.interpreted.add(closure.node)
		const declarators = staticConstsOf(closure.node)
		for (const declarator of declarators)
			this.declareUnset(declarator.id, callCtx)
		for (const declarator of declarators) {
			const value = this.evaluate(declarator.init!, callCtx)
			// even one nothing reads, which the program may run for its effect
			const dynamic = findDynamic(value)
			if (dynamic) return dynamic
			this.destructure(declarator.id, value, callCtx)
		}
		const result = this.evaluate(staticBodyOf(closure.node)!, callCtx)
		if (isDynamic(result) && !result.isOpaque) return result
		// e.g. `note()` in `(max, tag = note()) => ...`, which the program runs
		// for its effect, though the precompiled call drops it
		const env = callCtx.env!
		const unread = [...env.valuesByBinding].flatMap(([binding, value]) =>
			env.read.has(binding) ? [] : [value]
		)
		if (params[params.length - 1]?.type !== "RestElement")
			unread.push(...args.slice(params.length))
		return this.dynamicIn(unread)?.asOperand() ?? result
	}

	// as findDynamic, remembering containers that hold none, as a callback
	// over a long array is passed it at each call
	private dynamicIn(value: unknown): DynamicValue | undefined {
		const walked: object[] = []
		const find = (value: unknown): DynamicValue | undefined => {
			if (isDynamic(value)) return value
			if (!isPlainContainer(value) || this.dynamicFree.has(value)) return
			// nothing writes to a container interpreted code holds
			this.dynamicFree.add(value)
			walked.push(value)
			for (const k of Reflect.ownKeys(value)) {
				const dynamic = find(Reflect.get(value, k))
				if (dynamic) return dynamic
			}
		}
		const dynamic = find(value)
		if (dynamic)
			for (const container of walked) this.dynamicFree.delete(container)
		return dynamic
	}

	// a const read before its declarator runs throws, so it refuses the call
	private declareUnset(pattern: Node, ctx: Context): void {
		walk(pattern, node => {
			if (isFunctionNode(node)) return false
			const binding = ctx.module.scopes.bindingsById.get(node)
			if (binding) {
				ctx.env!.valuesByBinding.set(
					binding,
					new DynamicValue(
						ctx.module,
						node,
						`\`${binding.name}\` is read before its declaration (${ctx.module.positionOf(node)})`
					)
				)
			}
			return true
		})
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
		return this.callNative(callee as Function, args, undefined, node, ctx, true)
	}

	private holeNameOf(node: Node, module: SourceModule, name?: string): string {
		return this.opts.runtime === "arktype" ?
				""
			:	holeNameOf(name, module.path, node.start)
	}

	private functionStandIn(closure: Closure, node: Node): object {
		// one stand-in per expression, however often it's evaluated
		const evaluated = !closure.env && this.standInsByNode.get(closure.node)
		if (evaluated) return evaluated
		const arity = parameterCount(closure.node)
		const name = this.holeNameOf(
			closure.node,
			closure.module,
			declaredNameOf(closure.node)
		)
		const standIn = createStandIn("function", closure.module, node, {
			closure,
			arity
		})
		const target =
			closure.node.type === "ArrowFunctionExpression" ? () => {} : class {}
		if (name) this.standInsByName.set(name, standIn)
		const proxy = this.standInProxy(target, standIn, {
			...this.factsOf(standIn, arity, name),
			apply: (_, __, args: unknown[]) => this.callStandIn(standIn, args),
			construct: () => {
				throw this.calledAtDefinition(standIn, undefined)
			}
		})
		if (!closure.env) this.standInsByNode.set(closure.node, proxy)
		return proxy
	}

	traceOf<t>(f: () => t): [result: t, trace: Trace] {
		const previous = this.looseTrace
		const trace = (this.looseTrace = emptyTrace())
		try {
			return [f(), trace]
		} finally {
			this.looseTrace = previous
		}
	}

	private callStandIn(standIn: StandIn, args: unknown[]): unknown {
		const active = this.activeCall
		if (active?.isArktype) standIn.isCalled = true
		else if (active?.isDefining) standIn.isCalledIndirectly = true
		const closure = standIn.closure!
		if (!staticBodyOf(closure.node)) {
			throw active?.isArktype === false ?
					this.notStaticHelper(standIn)
				:	this.calledAtDefinition(standIn, undefined)
		}
		const ctx = active?.ctx ?? {
			...rootContext(closure.module, undefined),
			trace: this.looseTrace ?? emptyTrace()
		}
		const params = runtimeParamsOf(closure.node)
		for (let i = 0; i < args.length; i++) {
			const param = params[Math.min(i, params.length - 1)] ?? closure.node
			const admitted = this.admit(
				args[i],
				param,
				{ ...ctx, module: closure.module },
				receivedNameProblem
			)
			if (isDynamic(admitted)) throw admitted
		}
		const result = this.interpretCall(closure, args, closure.node, ctx)
		if (!active?.isArktype) {
			if (isDynamic(result)) throw result
			return result
		}
		const converted = this.toArktype(result)
		if (isDynamic(converted)) {
			throw converted.hasCode("unsupported") ? converted : (
					this.calledAtDefinition(standIn, converted)
				)
		}
		return converted
	}

	private notStaticHelper(standIn: StandIn): DynamicValue {
		const { node: fn, module } = standIn.closure!
		const statement = unstaticStatementOf(fn)
		const isLast =
			fn.body?.type === "BlockStatement" &&
			statement === fn.body.body[fn.body.body.length - 1]
		return new DynamicValue(
			module,
			standIn.node,
			`${this.labelOf(standIn)} is not a static helper: ${
				fn.async ? "it's async"
				: fn.generator ? "it's a generator"
				: statement ?
					`it ${isLast ? "ends with" : "runs"} \`${module.snippetOf(statement)}\` (${module.positionOf(statement)}), where a static helper declares only consts before one \`return\``
				:	"its body is not one expression, or consts and one `return`"
			}`
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
		const name = this.holeNameOf(node, ctx.module, declaredNameOf(node))
		const standIn = createStandIn("class", ctx.module, node)
		if (name) this.standInsByName.set(name, standIn)
		const proxy = this.standInProxy(target, standIn, {
			...this.factsOf(
				standIn,
				length,
				name,
				node.body.body.some(
					element =>
						(element.type === "PropertyDefinition" ||
							element.type === "MethodDefinition" ||
							element.type === "AccessorProperty") &&
						element.static &&
						(element.computed ||
							(element.key as { value?: unknown }).value === "~standard")
				)
			),
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
		const standIn = createStandIn("opaque", dynamic.module, dynamic.node, {
			dynamic
		})
		// arktype may only check whether it's a Standard Schema
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

	private factsOf(
		standIn: StandIn,
		length: number | undefined,
		name: string,
		// a class whose statics may hold one
		mayBeStandardSchema = false
	): ProxyHandler<Function> {
		return {
			get: (target, k) =>
				k === "length" ? length
				: k === "name" ? name
				: answersFact(k) ? Reflect.get(target, k)
				: this.refuse(standIn),
			// arktype checks whether a function is a Standard Schema
			has: (target, k) =>
				k === "~standard" && !mayBeStandardSchema ?
					Reflect.has(target, k)
				:	this.refuse(standIn),
			getPrototypeOf: target => Reflect.getPrototypeOf(target)
		}
	}

	// answers only what arktype's facts module reads, refusing the rest
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

	// rejects arktype's placeholders and registry names in what it returns
	private admit<value>(
		value: value,
		node: Node,
		ctx: Context,
		problemOf = printedNameProblem
	): value | DynamicValue {
		const seen = new Set<unknown>()
		const unstable = this.unstableIn(value, seen)
		if (!unstable) {
			// nothing writes to a container interpreted code holds, so it stays clean
			for (const container of seen) this.admitted.add(container as object)
			return value
		}
		if (unstable === "registry")
			return this.reject(node, ctx, unstableArkProblem)
		return this.reject(
			node,
			ctx,
			`(${ctx.module.positionOf(node)}) ${problemOf(this.labelOf(unstable))}`,
			undefined,
			"unsupported"
		)
	}

	private unstableIn(
		value: unknown,
		seen: Set<unknown>
	): StandIn | "registry" | undefined {
		if (value instanceof RegExp) return this.unstableIn(value.source, seen)
		if (typeof value === "string") {
			for (const name of value.match(holeNamePattern) ?? []) {
				const standIn = this.standInsByName.get(name)
				if (standIn) return standIn
			}
			return value.includes("$ark.") ? "registry" : undefined
		}
		if (!isPlainContainer(value) || seen.has(value) || this.admitted.has(value))
			return
		seen.add(value)
		for (const k of Reflect.ownKeys(value)) {
			const descriptor = Reflect.getOwnPropertyDescriptor(value, k)!
			const unstable =
				this.unstableIn(k, seen) ?? this.unstableIn(descriptor.value, seen)
			if (unstable) return unstable
		}
	}

	nameOf(standIn: StandIn): string | undefined {
		return (
			standIn.closure?.name ||
			bindingOfFunction(standIn.node, standIn.module)?.name
		)
	}

	labelOf(standIn: StandIn): string {
		const name = this.nameOf(standIn)
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

// `this` in a non-arrow function or a class's members is its own
const bindsThis = (node: Node) =>
	node.type === "FunctionExpression" ||
	node.type === "FunctionDeclaration" ||
	node.type === "ClassBody"

// the facts arktype reads from a function or class besides name and length
const answersFact = (k: PropertyKey) =>
	k === arkKind || k === "constructor" || k === "prototype" || k === "toJSON"

const isMemberObject = (node: Node) =>
	node.parent?.type === "MemberExpression" && node.parent.object === node

const isReference = (node: Node) => {
	const { type } = unwrapExpression(node)
	return type === "Identifier" || type === "MemberExpression"
}

export const isDynamic = (value: unknown): value is DynamicValue =>
	value instanceof DynamicValue

// Types, matchers and typed functions validate their arguments
const isValidator = (value: unknown): boolean =>
	hasArkKind(value, "root") || value instanceof InternalTypedFn

// values the program can change after the build reads them
const isChangeable = (value: unknown): value is object =>
	isPlainContainer(value) || value instanceof Date || value instanceof RegExp

// a Generic parses its body per instantiation, a Scope its aliases lazily
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

const restOf = (value: PlainContainer, used: PropertyKey[]) => {
	const result: Record<PropertyKey, unknown> = {}
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
	read: new Set(),
	parent
})

const emptyTrace = (): Trace => ({
	reads: [],
	helpers: [],
	exportedFunctions: [],
	readFirst: []
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
		addHelper(into.helpers, node, module)
	for (const read of from.exportedFunctions) into.exportedFunctions.push(read)
	for (const read of from.readFirst) into.readFirst.push(read)
}

const addHelper = (
	helpers: [FunctionNode, SourceModule][],
	node: FunctionNode,
	module: SourceModule
) => {
	if (!helpers.some(([n]) => n === node)) helpers.push([node, module])
}

// the earliest offset that can run `node`, through an import cycle too
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
		if (isCallableBeforeBody(parent, module)) return module.program.start
		const binding = bindingOfFunction(parent, module)
		if (!binding) return runPointOf(parent, scope, module, seen)
		let result =
			binding.exportNames.length && importsValues(module) ?
				setAt(binding)
			:	Infinity
		for (const reference of binding.references)
			result = Math.min(result, runPointOf(reference.id, scope, module, seen))
		return result
	}
	return node.start
}

// e.g. a site in an exported function an import cycle can call early
export const runsBeforeBody = (node: Node, module: SourceModule): boolean =>
	runPointOf(node, module.program, module) <= module.program.start

// e.g. `Base` read by an exported function declared above it
const readsFirst = (
	node: Node,
	binding: Binding,
	module: SourceModule
): boolean => runPointOf(node, binding.scope.node, module) < setAt(binding)

// e.g. `V.and()` or `V()`, but not `V ?? x` or `V?.and()`
const throwsUnset = (node: Node): boolean => {
	const [operand, parent] = operatorOf(node)
	return (
		(parent?.type === "MemberExpression" &&
			parent.object === operand &&
			!parent.optional) ||
		(parent?.type === "CallExpression" &&
			parent.callee === operand &&
			!parent.optional)
	)
}

// where a declarator sets a binding, once its pattern element has run
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
	: isLoopVariable(binding) ? "is a loop variable"
	: binding.kind === "var" && !isDeclaredInBody(binding) ?
		"is a `var` declared in a nested statement, which may not run"
	:	undefined

const writtenProblemOf = (
	binding: Binding,
	write: Node,
	module: SourceModule
): string =>
	`\`${binding.name}\` is written at ${module.positionOf(write)}, so its value at the site is not known`

// e.g. not in a function or loop, which may run it again after a later write
const runsOnceIn = (node: Node, scope: Node): boolean => {
	for (
		let parent = node.parent;
		parent && parent !== scope;
		parent = parent.parent
	)
		if (isFunctionNode(parent) || isLoop(parent)) return false
	return true
}

const isLoop = (node: Node): boolean =>
	node.type === "ForStatement" ||
	node.type === "ForInStatement" ||
	node.type === "ForOfStatement" ||
	node.type === "WhileStatement" ||
	node.type === "DoWhileStatement"

const isLoopVariable = (binding: Binding) => {
	const declaration = binding.declaration.parent
	const loop = declaration?.parent
	return (
		(loop?.type === "ForInStatement" || loop?.type === "ForOfStatement") &&
		loop.left === declaration
	)
}

// e.g. not `V` in `if (flag) { var V = type("string") }`
const isDeclaredInBody = (binding: Binding): boolean => {
	let container = binding.declaration.parent?.parent
	if (container?.type === "ExportNamedDeclaration") container = container.parent
	const scope = binding.scope.node
	return container === scope || ("body" in scope && container === scope.body)
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

// the name JS infers for a function or class from its position, if any
export const inferredNameOf = (fn: FunctionNode): string => {
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
