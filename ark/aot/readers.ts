import type { IntrospectionMember } from "arktype/internal/runtime.ts"
import { introspectionMembers } from "arktype/internal/standalone.ts"
import { join } from "node:path"
import type { Class, Node, Span } from "oxc-parser"
import {
	isFunctionNode,
	memberNameOf,
	type FunctionNode,
	type ModuleGraph
} from "./graph.ts"
import { dependencyOf } from "./host.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isWriteTarget,
	operatorOf,
	runtimeParamsOf,
	unwrapExpression,
	walk,
	type Binding
} from "./scope.ts"
import { importsOf } from "./scan.ts"
import { isDead, type RuntimeModule, type UsageProgram } from "./usage.ts"

// a key the build can't name, like an array's index
export const anyKey: unique symbol = Symbol("any key")

export type Key = string | typeof anyKey

// what a value holds: the validator, or its ~standard, at path
export interface Held {
	path: readonly Key[]
	of: "type" | "standard"
}

export const validatorHeld: Held = { path: [], of: "type" }

export interface ReaderSeed {
	runtime: RuntimeModule
	node: Node
	held: Held
}

// how the introspection members a validator bakes were decided
export type ReadStep = "dataflow" | "fields" | "lost"

export interface Reading {
	members: IntrospectionMember[]
	step: ReadStep
	// e.g. "node_modules/x/index.js:3:5 reads ~standard.jsonSchema"
	reads: string[]
	// e.g. "node_modules/x/index.js:3:5 stores it at a key the build can't name"
	lost: string[]
	// where code the build can't see may read it, which the runtime fails loudly
	unseen: string[]
}

export interface ReaderProgram extends UsageProgram {
	// false where the build doesn't read the whole program, so no field read is followed
	whole: boolean
}

// what each validator's readers read of it, followed into its dependencies
export const readingsOf = (
	program: ReaderProgram,
	graph: ModuleGraph,
	// dependencies' modules, read once for every program
	read: Map<string, SourceModule | null>,
	seeds: readonly ReaderSeed[]
): Reading[] => {
	const readers = new Readers(program, graph, read)
	return seeds.map(seed => {
		const follow = new Follow(readers)
		follow.push(seed.node, seed.runtime.module, seed.held)
		follow.run()
		return follow.reading()
	})
}

interface Lost {
	at: string
	why: string
}

interface Fact {
	node: Node
	module: SourceModule
	held: Held
}

interface Entry {
	call: Node
	module: SourceModule
	// e.g. anyKey for a map() callback, whose returns its call holds at an index
	wrap: readonly Key[]
}

type Located<node extends Node = Node> = { node: node; module: SourceModule }

type Value =
	| { kind: "function"; fn: FunctionNode; module: SourceModule }
	| { kind: "class" | "instance"; cls: Class; module: SourceModule }
	| { kind: "object"; literal: Node; module: SourceModule }
	| { kind: "namespace"; module: SourceModule }

const heldKeyOf = (held: Held): string =>
	`${held.of}:${held.path.map(k => (k === anyKey ? "*" : JSON.stringify(k))).join(".")}`

// the program's modules, read once for every validator
class Readers {
	program: ReaderProgram
	graph: ModuleGraph
	private read: Map<string, SourceModule | null>
	private modulesById = new Map<string, SourceModule>()
	private runtimesByModule = new Map<SourceModule, RuntimeModule>()
	private importersById: Map<string, ImportEdge[]> | undefined
	private fieldReads: Map<string, Located[]> | undefined
	private dependenciesByRoot = new Map<string, ReadonlySet<string>>()

	constructor(
		program: ReaderProgram,
		graph: ModuleGraph,
		read: Map<string, SourceModule | null>
	) {
		this.program = program
		this.graph = graph
		this.read = read
		for (const runtime of program.modules.values()) {
			this.runtimesByModule.set(runtime.module, runtime)
			this.modulesById.set(runtime.module.id, runtime.module)
		}
	}

	runtimeOf(module: SourceModule): RuntimeModule | undefined {
		return this.runtimesByModule.get(module)
	}

	moduleOf(id: string): SourceModule | undefined {
		const own = this.modulesById.get(id)
		if (own) return own
		let module = this.read.get(id)
		if (module === undefined) {
			const source =
				/\.[cm]?[jt]sx?$/.test(id) ? this.graph.host.readFile(id) : undefined
			module =
				source === undefined ? null : (
					new SourceModule(id, source, this.graph.pathOf(id))
				)
			this.read.set(id, module)
		}
		return module ?? undefined
	}

	resolve(specifier: string, importer: SourceModule): SourceModule | undefined {
		if (runtimeSpecifier.test(specifier)) return
		const id =
			(this.runtimesByModule.has(importer) &&
				this.program.resolve(specifier, importer.id)) ||
			this.graph.host.resolve(specifier, importer.id)
		return id === undefined ? undefined : this.moduleOf(id)
	}

	// whether a module may read what a package holds: the program's own, the
	// package's or one depending on it
	mayRead(module: SourceModule, owner: string): boolean {
		const dependency = dependencyOf(module.id)
		if (!dependency) return true
		const [root, name] = dependency
		if (name === owner) return true
		let dependsOn = this.dependenciesByRoot.get(root)
		if (!dependsOn) {
			const manifest = this.graph.host.readFile(join(root, "package.json"))
			const { dependencies, peerDependencies, optionalDependencies } =
				manifest === undefined ? {} : JSON.parse(manifest)
			dependsOn = new Set(
				Object.keys({
					...dependencies,
					...peerDependencies,
					...optionalDependencies
				})
			)
			this.dependenciesByRoot.set(root, dependsOn)
		}
		return dependsOn.has(owner)
	}

	importersOf(id: string): ImportEdge[] {
		this.importersById ??= this.linkImporters()
		return this.importersById.get(id) ?? []
	}

	// each read of a property by name, anywhere the program reaches
	fieldReadsOf(name: string): Located[] {
		this.fieldReads ??= this.indexFields()
		return this.fieldReads.get(name) ?? []
	}

	private linkImporters(): Map<string, ImportEdge[]> {
		const result = new Map<string, ImportEdge[]>()
		for (const runtime of this.program.modules.values()) {
			const { module } = runtime
			const add = (specifier: string, edge: ImportEdge) => {
				const id = this.program.resolve(specifier, module.id)
				if (id === undefined) return
				const edges = result.get(id)
				if (edges) edges.push(edge)
				else result.set(id, [edge])
			}
			for (const statement of module.program.body) {
				if (statement.type === "ImportDeclaration") {
					if (statement.importKind === "type") continue
					for (const specifier of statement.specifiers) {
						if (
							specifier.type === "ImportSpecifier" &&
							specifier.importKind === "type"
						)
							continue
						const binding = module.scopes.bindingsById.get(specifier.local)!
						add(
							statement.source.value,
							specifier.type === "ImportNamespaceSpecifier" ?
								{ kind: "namespace", binding, module }
							:	{
									kind: "named",
									name:
										specifier.type === "ImportDefaultSpecifier" ?
											"default"
										:	exportNameOf(specifier.imported),
									binding,
									module
								}
						)
					}
				} else if (statement.type === "ExportNamedDeclaration") {
					if (!statement.source || statement.exportKind === "type") continue
					for (const specifier of statement.specifiers) {
						add(statement.source.value, {
							kind: "reexport",
							name: exportNameOf(specifier.local),
							as: exportNameOf(specifier.exported),
							module
						})
					}
				} else if (statement.type === "ExportAllDeclaration") {
					if (statement.exportKind === "type") continue
					add(
						statement.source.value,
						statement.exported ?
							{ kind: "whole", at: module.positionOf(statement) }
						:	{ kind: "star", module }
					)
				}
			}
			walk(module.program, node => {
				const specifier =
					node.type === "ImportExpression" ? node.source
					: (
						node.type === "CallExpression" &&
						node.callee.type === "Identifier" &&
						node.callee.name === "require"
					) ?
						node.arguments[0]
					:	undefined
				if (
					specifier?.type === "Literal" &&
					typeof specifier.value === "string"
				)
					add(specifier.value, { kind: "whole", at: module.positionOf(node) })
				return true
			})
		}
		return result
	}

	// every module the program's own reach through their imports, read from disk
	private indexFields(): Map<string, Located[]> {
		const result = new Map<string, Located[]>()
		const add = (name: unknown, located: Located) => {
			if (typeof name !== "string" && typeof name !== "number") return
			const key = String(name)
			const reads = result.get(key)
			if (reads) reads.push(located)
			else result.set(key, [located])
		}
		const pending = [...this.program.modules.values()].map(
			runtime => runtime.module
		)
		const seen = new Set(pending)
		for (let i = 0; i < pending.length; i++) {
			const module = pending[i]
			const runtime = this.runtimesByModule.get(module)
			walk(module.program, node => {
				if (runtime && isDead(node, runtime)) return false
				if (node.type === "MemberExpression" && !isWriteTarget(node))
					add(memberNameOf(node), { node, module })
				else if (node.type === "ObjectPattern") {
					for (const property of node.properties) {
						if (property.type === "Property")
							add(propertyKeyOf(property), { node: property.value, module })
					}
				}
				return true
			})
			for (const [specifier] of importsOf(module.id, module.source).imports) {
				const target = this.resolve(specifier, module)
				if (target && !seen.has(target)) {
					seen.add(target)
					pending.push(target)
				}
			}
		}
		return result
	}
}

// arktype's own, which read nothing of a program's validators
const runtimeSpecifier = /^(?:arktype|@ark\/(?:schema|util))(?:\/|$)/

type ImportEdge =
	| { kind: "named"; name: string; binding: Binding; module: SourceModule }
	| { kind: "namespace"; binding: Binding; module: SourceModule }
	| { kind: "reexport"; name: string; as: string; module: SourceModule }
	| { kind: "star"; module: SourceModule }
	| { kind: "whole"; at: string }

// one validator's reads, followed until each is decided
class Follow {
	private readers: Readers
	private read = new Map<IntrospectionMember, string>()
	private lost: Lost[] = []
	private unseen: string[] = []
	private followsFields = false
	private seen = new Map<Node, Set<string>>()
	private facts = 0
	private pending: Fact[] = []
	private entries = new Map<FunctionNode, Entry[]>()
	private returned = new Map<FunctionNode, Map<string, Held>>()
	private fields = new Set<string>()
	private exports = new Set<string>()
	// what each binding is bound to, which a guard reading it tests
	private heldsByBinding = new Map<Binding, Set<string>>()

	constructor(readers: Readers) {
		this.readers = readers
	}

	push(node: Node, module: SourceModule, held: Held): void {
		if (held.path.length > maxDepth) {
			return this.lose(
				node,
				module,
				"holds it nested deeper than the build follows"
			)
		}
		if (!this.isReached(node, module)) return
		const key = heldKeyOf(held)
		const keys = this.seen.get(node)
		if (keys?.has(key)) return
		if (keys) keys.add(key)
		else this.seen.set(node, new Set([key]))
		if ((keys?.size ?? 1) > maxHelds || ++this.facts > maxFacts) {
			return this.lose(
				node,
				module,
				"holds it in more ways than the build follows"
			)
		}
		this.pending.push({ node, module, held })
	}

	run(): void {
		for (
			let fact = this.pending.pop();
			fact && this.facts <= maxFacts;
			fact = this.pending.pop()
		)
			this.readAt(fact)
	}

	// whether a branch holding the node may run with the validator where its guard reads it
	private isReached(node: Node, module: SourceModule): boolean {
		for (let at = node; at.parent; at = at.parent) {
			const parent = at.parent
			let test: Node | undefined
			let expected = true
			if (
				parent.type === "IfStatement" ||
				parent.type === "ConditionalExpression"
			) {
				if (at === parent.test) continue
				test = parent.test
				expected = at === parent.consequent
			} else if (parent.type === "LogicalExpression" && at === parent.right) {
				test = parent.left
				expected = parent.operator === "&&"
				if (parent.operator === "??") {
					const left = this.evaluate(parent.left, module)
					if (left && left.kind !== "value") return false
					continue
				}
			} else if (
				(parent.type === "BlockStatement" ||
					parent.type === "Program" ||
					parent.type === "StaticBlock") &&
				!this.isReachedAfter(parent.body, at, module)
			)
				return false
			if (!test) continue
			const value = truthinessOf(this.evaluate(test, module))
			if (value !== undefined && value !== expected) return false
		}
		return true
	}

	// e.g. not past `if (!isStandardSchema(schema)) return`, reached by a validator
	private isReachedAfter(
		statements: readonly Node[],
		node: Node,
		module: SourceModule
	): boolean {
		for (const statement of statements) {
			if (statement === node) return true
			if (
				statement.type === "IfStatement" &&
				!statement.alternate &&
				exits(statement.consequent) &&
				truthinessOf(this.evaluate(statement.test, module)) === true
			)
				return false
			if (
				statement.type === "ReturnStatement" ||
				statement.type === "ThrowStatement"
			)
				return false
		}
		return true
	}

	// what an expression a guard tests is, where reading it with the validator decides it
	private evaluate(
		node: Node,
		module: SourceModule,
		env?: ReadonlyMap<Binding, Abstract>,
		depth = 0
	): Abstract | undefined {
		if (depth > 8) return
		node = unwrapExpression(node)
		const of = (inner: Node) => this.evaluate(inner, module, env, depth + 1)
		switch (node.type) {
			case "Literal":
				return { kind: "value", value: node.value }
			case "TemplateLiteral":
				return node.expressions.length ?
						undefined
					:	{ kind: "value", value: node.quasis[0].value.cooked }
			case "Identifier": {
				if (node.name === "undefined" && !module.scopes.byId.get(node)?.binding)
					return { kind: "value", value: undefined }
				const binding = module.scopes.byId.get(node)?.binding
				if (!binding) return
				if (env?.has(binding)) return env.get(binding)
				const helds = this.heldsByBinding.get(binding)
				if (helds?.size === 1 && !binding.writes.length) {
					const [key] = helds
					if (key === "type:") return { kind: "held", of: "type" }
					if (key === "standard:") return { kind: "held", of: "standard" }
				}
				const init = this.constInitOf(binding, module)
				return (
					init && this.evaluate(init.node, init.module, undefined, depth + 1)
				)
			}
			case "ChainExpression":
				return of(node.expression)
			case "MemberExpression": {
				const object = of(node.object)
				const name = memberNameOf(node)
				if (object?.kind !== "held" || typeof name !== "string") return
				return memberOfHeld(object.of, name)
			}
			case "UnaryExpression": {
				const value = of(node.argument)
				if (node.operator === "!") {
					const truthy = truthinessOf(value)
					return truthy === undefined ? undefined : (
							{ kind: "value", value: !truthy }
						)
				}
				if (node.operator === "typeof") {
					const type = typeOfAbstract(value)
					return type === undefined ? undefined : { kind: "value", value: type }
				}
				if (node.operator === "void") return { kind: "value", value: undefined }
				return
			}
			case "LogicalExpression": {
				const left = of(node.left)
				if (node.operator === "??") {
					if (!left) return
					return (
							left.kind === "value" &&
								(left.value === null || left.value === undefined)
						) ?
							of(node.right)
						:	left
				}
				const truthy = truthinessOf(left)
				if (truthy === undefined) return
				return truthy === (node.operator === "&&") ? of(node.right) : left
			}
			case "ConditionalExpression": {
				const truthy = truthinessOf(of(node.test))
				return truthy === undefined ? undefined : (
						of(truthy ? node.consequent : node.alternate)
					)
			}
			case "BinaryExpression": {
				if (node.operator === "in") {
					const right = of(node.right)
					if (right?.kind !== "held") return
					const left = of(node.left)
					if (left?.kind === "symbol") return { kind: "value", value: false }
					if (left?.kind !== "value" || typeof left.value !== "string") return
					return { kind: "value", value: hasMember(right.of, left.value) }
				}
				if (node.operator === "instanceof") {
					const left = of(node.left)
					if (left?.kind !== "held") return
					const right = unwrapExpression(node.right)
					// a validator's prototypes are arktype's, Function's and Object's
					if (right.type !== "Identifier") return
					const isGlobal = !module.scopes.byId.get(right)?.binding
					if (!isGlobal) return { kind: "value", value: false }
					return (
						(
							right.name === "Object" ||
								(right.name === "Function" && left.of === "type")
						) ?
							{ kind: "value", value: true }
						: right.name in globalThis ? { kind: "value", value: false }
						: undefined
					)
				}
				const isEquality = /^[!=]==?$/.test(node.operator)
				if (!isEquality) return
				const left = of(node.left)
				const right = of(node.right)
				const equal = equalityOf(left, right, node.operator.length === 3)
				return equal === undefined ? undefined : (
						{ kind: "value", value: node.operator[0] === "!" ? !equal : equal }
					)
			}
			case "CallExpression": {
				const callee = unwrapExpression(node.callee)
				const name = globalNameOf(callee, module)
				if (name === "Symbol.for" || name === "Symbol")
					return { kind: "symbol" }
				if (name === "Array.isArray") {
					const arg = node.arguments[0] && of(node.arguments[0])
					return arg?.kind === "held" ?
							{ kind: "value", value: false }
						:	undefined
				}
				const value = this.valueOf(callee, module)
				if (value?.kind !== "function") return
				const params = runtimeParamsOf(value.fn)
				const scope = new Map<Binding, Abstract>()
				for (const [i, param] of params.entries()) {
					if (param.type !== "Identifier") return
					const binding = value.module.scopes.bindingsById.get(param)
					const arg = node.arguments[i]
					const evaluated =
						arg && arg.type !== "SpreadElement" ? of(arg) : undefined
					if (binding && evaluated) scope.set(binding, evaluated)
				}
				return this.evaluateBody(value.fn, value.module, scope, depth + 1)
			}
		}
	}

	// what a helper like `isStandardSchema` returns, run on what it's passed
	private evaluateBody(
		fn: FunctionNode,
		module: SourceModule,
		env: Map<Binding, Abstract>,
		depth: number
	): Abstract | undefined {
		if (!fn.body || fn.async || fn.generator) return
		if (fn.body.type !== "BlockStatement")
			return this.evaluate(fn.body, module, env, depth)
		const run = (statements: readonly Node[]): Abstract | null | undefined => {
			for (const statement of statements) {
				switch (statement.type) {
					case "ReturnStatement":
						return statement.argument ?
								this.evaluate(statement.argument, module, env, depth)
							:	{ kind: "value", value: undefined }
					case "VariableDeclaration":
						for (const declarator of statement.declarations) {
							if (declarator.id.type !== "Identifier" || !declarator.init)
								return
							const binding = module.scopes.bindingsById.get(declarator.id)
							const value = this.evaluate(declarator.init, module, env, depth)
							if (binding && value) env.set(binding, value)
						}
						break
					case "IfStatement": {
						const truthy = truthinessOf(
							this.evaluate(statement.test, module, env, depth)
						)
						if (truthy === undefined) return
						const branch = truthy ? statement.consequent : statement.alternate
						if (!branch) break
						const result = run(
							branch.type === "BlockStatement" ? branch.body : [branch]
						)
						if (result !== null) return result
						break
					}
					case "ExpressionStatement":
						break
					default:
						return
				}
			}
			return null
		}
		return run(fn.body.body) ?? undefined
	}

	private constInitOf(
		binding: Binding,
		module: SourceModule,
		depth = 0
	): Located | undefined {
		if (depth > 8) return
		const { declaration } = binding
		if (
			binding.kind === "const" &&
			declaration.type === "VariableDeclarator" &&
			declaration.id === binding.id &&
			declaration.init
		)
			return { node: declaration.init, module }
		if (binding.kind !== "import") return
		const statement = declaration.parent
		if (
			statement?.type !== "ImportDeclaration" ||
			declaration.type !== "ImportSpecifier"
		)
			return
		const target = this.readers.resolve(statement.source.value, module)
		const entry =
			target?.scopes.exportsByName[exportNameOf(declaration.imported)]
		return entry?.kind === "binding" ?
				this.constInitOf(entry.binding, target!, depth + 1)
			:	undefined
	}

	reading(): Reading {
		const members = new Set(this.read.keys())
		const step: ReadStep =
			this.lost.length ? "lost"
			: this.followsFields ? "fields"
			: "dataflow"
		if (this.lost.length)
			for (const member of introspectionMembers) members.add(member)
		return {
			members: introspectionMembers.filter(member => members.has(member)),
			step,
			reads: [...this.read].map(([member, at]) => `${at} reads ${member}`),
			lost: this.lost.map(lost => `${lost.at} ${lost.why}`),
			unseen: this.unseen
		}
	}

	private record(
		member: IntrospectionMember,
		node: Node,
		module: SourceModule
	) {
		if (!this.read.has(member)) this.read.set(member, module.positionOf(node))
	}

	private lose(node: Node, module: SourceModule, why: string): void {
		this.lost.push({ at: module.positionOf(node), why })
	}

	private readAt({ node, module, held }: Fact): void {
		const [operand, parent] = operatorOf(node)
		if (!parent) return
		const push = (to: Node, toHeld = held) => this.push(to, module, toHeld)
		const lose = (why: string) => this.lose(operand, module, why)
		const isValue = !held.path.length
		switch (parent.type) {
			case "ConditionalExpression":
				if (parent.test !== operand) push(parent)
				return
			case "LogicalExpression":
			case "AwaitExpression":
				return push(parent)
			case "SequenceExpression":
				if (parent.expressions[parent.expressions.length - 1] === operand)
					push(parent)
				return
			case "AssignmentExpression":
				if (parent.right !== operand) return
				push(parent)
				return this.write(parent.left, module, held)
			case "VariableDeclarator":
				if (parent.init === operand) this.bindPattern(parent.id, module, held)
				return
			case "AssignmentPattern":
				if (parent.right === operand)
					this.bindPattern(parent.left, module, held)
				return
			case "Property":
				if (parent.key === operand) {
					// a computed key converts it to a string
					if (isValue && held.of === "type")
						this.record("expression", parent, module)
					return
				}
				if (
					parent.value !== operand ||
					parent.parent?.type !== "ObjectExpression"
				) {
					return lose(
						`holds it at a key of ${module.snippetOf(parent.parent ?? parent)}, which the build can't follow`
					)
				}
				if (parent.kind !== "init") return lose("passes it to an accessor")
				return push(parent.parent, {
					...held,
					path: [propertyKeyOf(parent) ?? anyKey, ...held.path]
				})
			case "ArrayExpression":
				return push(parent, { ...held, path: [anyKey, ...held.path] })
			case "SpreadElement":
				return this.spread(parent, operand, module, held)
			case "PropertyDefinition":
				if (parent.value !== operand) return
				return this.followField(propertyKeyOf(parent), parent, module, held)
			case "MemberExpression":
				if (parent.object !== operand) {
					// a computed key converts it to a string
					if (isValue && held.of === "type")
						this.record("expression", parent, module)
					return
				}
				return this.member(parent, module, held)
			case "CallExpression":
			case "NewExpression":
				if (parent.callee === operand) return
				return this.pass(parent, operand, module, held)
			case "TaggedTemplateExpression":
				if (parent.tag !== operand) return
				return
			case "TemplateLiteral":
				if (isValue && held.of === "type")
					this.record("expression", parent, module)
				return
			case "BinaryExpression":
				// `+`, `in` and arithmetic convert it to a primitive
				if (
					isValue &&
					held.of === "type" &&
					!/^(?:[!=]==?|instanceof)$/.test(parent.operator) &&
					!(parent.operator === "in" && parent.right === operand)
				)
					this.record("expression", parent, module)
				return
			case "ReturnStatement":
				return this.returnFrom(
					enclosingFunctionOf(parent),
					parent,
					module,
					held
				)
			case "ArrowFunctionExpression":
				if (parent.body === operand)
					this.returnFrom(parent, parent, module, held)
				return
			case "ForOfStatement":
				if (parent.right !== operand || isValue) return
				return this.bindLeft(parent.left, module, {
					...held,
					path: held.path.slice(1)
				})
			case "ExportDefaultDeclaration":
				return this.readExport(module, "default", held, operand)
			case "YieldExpression":
				return lose("yields it from a generator")
			case "ThrowStatement":
				return lose("throws it")
			case "JSXExpressionContainer":
				return lose("passes it to a JSX element")
			case "UnaryExpression":
			case "IfStatement":
			case "WhileStatement":
			case "DoWhileStatement":
			case "ForStatement":
			case "ForInStatement":
			case "SwitchStatement":
			case "SwitchCase":
			case "ExpressionStatement":
			case "ChainExpression":
				return
		}
		lose(
			`reads it in ${module.snippetOf(parent)}, which the build can't follow`
		)
	}

	// `target = value`, where target may be a property
	private write(target: Node, module: SourceModule, held: Held): void {
		target = unwrapExpression(target)
		if (target.type !== "MemberExpression")
			return this.bindPattern(target, module, held)
		const owner = globalNameOf(target.object, module)
		if (owner && globalObjects.has(owner)) {
			return this.lose(
				target,
				module,
				"stores it on the global object, which code outside the bundle may read"
			)
		}
		this.followField(memberNameOf(target), target, module, held)
	}

	// stored at a key, which any read of it by name may read
	private followField(
		name: unknown,
		node: Node,
		module: SourceModule,
		held: Held
	): void {
		// a holder's own key names where the validator is
		const key =
			held.path.length ? held.path[held.path.length - 1]
			: typeof name === "string" || typeof name === "number" ? String(name)
			: anyKey
		const fieldHeld: Held = held.path.length ? { ...held, path: [] } : held
		if (key === anyKey)
			return this.lose(node, module, "stores it at a key the build can't name")
		if (!this.readers.program.whole) {
			return this.lose(
				node,
				module,
				`stores it at .${key}, which a build reading one module at a time can't follow`
			)
		}
		// a package's own objects are read by it, the program and packages depending on it
		const owner = dependencyOf(module.id)?.[1]
		const fieldKey = `${key}\0${owner}\0${heldKeyOf(fieldHeld)}`
		if (this.fields.has(fieldKey)) return
		this.fields.add(fieldKey)
		this.followsFields = true
		for (const read of this.readers.fieldReadsOf(key)) {
			if (owner !== undefined && !this.readers.mayRead(read.module, owner))
				continue
			if (read.node.parent?.type === "Property" || isPatternTarget(read.node))
				this.bindPattern(read.node, read.module, fieldHeld)
			else this.push(read.node, read.module, fieldHeld)
		}
	}

	private spread(
		spread: Extract<Node, { type: "SpreadElement" }>,
		operand: Node,
		module: SourceModule,
		held: Held
	): void {
		const container = spread.parent!
		if (!held.path.length) {
			if (container.type === "ObjectExpression" || held.of === "standard")
				return this.lose(operand, module, "copies its members")
			return
		}
		if (
			container.type === "ObjectExpression" ||
			container.type === "ArrayExpression"
		)
			return this.push(container, module, held)
		if (
			container.type === "CallExpression" ||
			container.type === "NewExpression"
		) {
			return this.pass(container, spread, module, {
				...held,
				path: held.path.slice(1)
			})
		}
	}

	private member(
		member: Extract<Node, { type: "MemberExpression" }>,
		module: SourceModule,
		held: Held
	): void {
		if (isWriteTarget(member)) return
		const name = memberNameOf(member)
		const key =
			typeof name === "string" || typeof name === "number" ? String(name)
			: member.computed ? constantOf(member.property, module)
			: undefined
		const [method, call] = operatorOf(member)
		// a promise's callback is passed what it resolves to
		if (
			key === "then" &&
			call?.type === "CallExpression" &&
			call.callee === method
		)
			return this.callback(call, module, held, [])
		if (held.path.length) {
			const [first, ...rest] = held.path
			if (
				call?.type === "CallExpression" &&
				call.callee === method &&
				key !== undefined &&
				first === anyKey &&
				key in arrayMethods
			)
				return this.arrayMethod(key, call, module, held)
			if (key === undefined || first === anyKey || first === key)
				this.push(member, module, { ...held, path: rest })
			return
		}
		if (key === undefined) {
			if (held.of === "standard")
				return this.record("~standard.jsonSchema", member, module)
			return this.lose(member, module, "reads it at a computed key")
		}
		if (held.of === "standard") {
			if (key === "jsonSchema")
				this.record("~standard.jsonSchema", member, module)
			return
		}
		if (key === "~standard")
			return this.push(member, module, { path: [], of: "standard" })
		if (key === "toString") return this.record("expression", member, module)
		if (introspectionMembers.includes(key as never))
			this.record(key as IntrospectionMember, member, module)
	}

	// e.g. `tools.map(tool => tool.inputSchema)`, passing each element on
	private arrayMethod(
		name: string,
		call: Extract<Node, { type: "CallExpression" }>,
		module: SourceModule,
		held: Held
	): void {
		const element: Held = { ...held, path: held.path.slice(1) }
		const returns = arrayMethods[name]
		if (returns === "holder") this.push(call, module, held)
		else if (returns === "element") this.push(call, module, element)
		this.callback(
			call,
			module,
			element,
			returns === "mapped" ? [anyKey] : undefined,
			name === "reduce" ? 1 : 0
		)
	}

	// a callback passed what its call reads, whose returns the call holds at wrap
	private callback(
		call: Extract<Node, { type: "CallExpression" }>,
		module: SourceModule,
		held: Held,
		wrap: readonly Key[] | undefined,
		index = 0
	): void {
		const [callback] = call.arguments
		if (!callback || callback.type === "SpreadElement") return
		const value = this.valueOf(callback, module)
		if (value?.kind !== "function") {
			return this.lose(
				callback,
				module,
				"passes it to a callback the build can't follow"
			)
		}
		const param = runtimeParamsOf(value.fn)[index]
		if (param) this.bindPattern(param, value.module, held)
		if (wrap) this.addEntry(value.fn, { call, module, wrap })
	}

	// passed as an argument
	private pass(
		call: Extract<Node, { type: "CallExpression" | "NewExpression" }>,
		arg: Node,
		module: SourceModule,
		held: Held
	): void {
		const index = call.arguments.indexOf(arg as never)
		const spreadAt = call.arguments.findIndex(a => a.type === "SpreadElement")
		const callee = unwrapExpression(call.callee)
		const builtin = this.builtin(call, callee, index, module, held)
		if (builtin) return
		const value = this.calleeOf(call, module)
		if (!value) {
			// what holds it is stored where any read of its key may find it
			if (held.path.length)
				return this.followField(undefined, arg, module, held)
			return this.lose(
				arg,
				module,
				`passes it to ${module.snippetOf(callee)}, which the build can't follow`
			)
		}
		const params = runtimeParamsOf(value.fn)
		const indices =
			spreadAt !== -1 && index >= spreadAt ?
				params.map((_, i) => i).slice(spreadAt)
			:	[index]
		for (const i of indices) {
			const param = params[i]
			if (param?.type === "RestElement") {
				this.bindPattern(param.argument, value.module, {
					...held,
					path: [anyKey, ...held.path]
				})
			} else if (param) this.bindPattern(param, value.module, held)
		}
		if (readsArguments(value.fn))
			return this.lose(arg, module, "passes it to a function reading arguments")
		this.addEntry(value.fn, { call, module, wrap: [] })
	}

	private addEntry(fn: FunctionNode, entry: Entry): void {
		const entries = this.entries.get(fn)
		if (entries) entries.push(entry)
		else this.entries.set(fn, [entry])
		for (const held of this.returned.get(fn)?.values() ?? [])
			this.push(entry.call, entry.module, wrapped(held, entry.wrap))
	}

	private returnFrom(
		fn: FunctionNode | undefined,
		at: Node,
		module: SourceModule,
		held: Held
	): void {
		if (!fn) return
		const owner = fn.parent
		// e.g. `{ get schema() { return T } }`, read as its key
		if (
			(owner?.type === "Property" || owner?.type === "MethodDefinition") &&
			owner.kind === "get"
		)
			return this.followField(propertyKeyOf(owner), at, module, held)
		let returned = this.returned.get(fn)
		if (!returned) this.returned.set(fn, (returned = new Map()))
		const key = heldKeyOf(held)
		if (returned.has(key)) return
		returned.set(key, held)
		let entries = this.entries.get(fn)
		if (!entries) {
			entries = this.callsOf(fn, module)
			if (entries) this.entries.set(fn, entries)
		}
		if (!entries) {
			// what holds it is read where any read of its key may find it
			if (held.path.length) return this.followField(undefined, at, module, held)
			return this.lose(
				at,
				module,
				"returns it from a function whose calls the build can't follow"
			)
		}
		for (const entry of entries)
			this.push(entry.call, entry.module, wrapped(held, entry.wrap))
	}

	// the calls of a function passed as a callback or held by a const, where each is seen
	private callsOf(fn: FunctionNode, module: SourceModule): Entry[] | undefined {
		const [operand, parent] = operatorOf(fn)
		if (parent?.type === "VariableDeclarator" && parent.init === operand) {
			const binding =
				parent.id.type === "Identifier" ?
					module.scopes.bindingsById.get(parent.id)
				:	undefined
			return binding && this.callsOfBinding(binding, module)
		}
		if (parent?.type !== "CallExpression" || parent.callee === operand) return
		const index = parent.arguments.indexOf(operand as never)
		const callee = unwrapExpression(parent.callee)
		const name =
			callee.type === "MemberExpression" ? memberNameOf(callee) : undefined
		// its result is what each callback returns, or reads them as booleans
		if (name === "then" || name === "catch" || name === "finally")
			return [{ call: parent, module, wrap: [] }]
		if (typeof name === "string" && name in arrayMethods) {
			return arrayMethods[name] === "mapped" ?
					[{ call: parent, module, wrap: [anyKey] }]
				:	[]
		}
		const value = this.valueOf(callee, module)
		if (value?.kind !== "function") return
		const param = runtimeParamsOf(value.fn)[index]
		const binding =
			param?.type === "Identifier" ?
				value.module.scopes.bindingsById.get(param)
			:	undefined
		return binding && this.callsOfBinding(binding, value.module)
	}

	private callsOfBinding(
		binding: Binding,
		module: SourceModule
	): Entry[] | undefined {
		if (binding.exportNames.length) return
		const entries: Entry[] = []
		for (const reference of binding.references) {
			if (reference.isWrite) continue
			const [operand, parent] = operatorOf(reference.id)
			if (parent?.type !== "CallExpression" || parent.callee !== operand) return
			entries.push({ call: parent, module, wrap: [] })
		}
		return entries
	}

	// a const, let, param or destructured binding
	private bindPattern(pattern: Node, module: SourceModule, held: Held): void {
		switch (pattern.type) {
			case "Identifier": {
				const binding = module.scopes.bindingsById.get(pattern)
				if (!binding) return
				const helds = this.heldsByBinding.get(binding)
				if (helds) helds.add(heldKeyOf(held))
				else this.heldsByBinding.set(binding, new Set([heldKeyOf(held)]))
				this.readBinding(binding, module, held)
				return
			}
			case "AssignmentPattern":
				return this.bindPattern(pattern.left, module, held)
			case "MemberExpression":
				return this.write(pattern, module, held)
			case "ObjectPattern":
				for (const property of pattern.properties) {
					if (property.type === "RestElement") {
						if (!held.path.length)
							this.lose(property, module, "copies its members")
						else this.bindPattern(property.argument, module, held)
						continue
					}
					const key =
						propertyKeyOf(property) ??
						(property.computed ? constantOf(property.key, module) : undefined)
					if (!held.path.length) {
						const read = this.readMember(key, held, property, module)
						if (read) this.bindPattern(property.value, module, read)
						continue
					}
					const [first, ...rest] = held.path
					if (key === undefined || first === anyKey || first === key)
						this.bindPattern(property.value, module, { ...held, path: rest })
				}
				return
			case "ArrayPattern":
				if (!held.path.length) return
				for (const [i, element] of pattern.elements.entries()) {
					if (!element) continue
					if (element.type === "RestElement")
						this.bindPattern(element.argument, module, held)
					else if (held.path[0] === anyKey || held.path[0] === String(i)) {
						this.bindPattern(element, module, {
							...held,
							path: held.path.slice(1)
						})
					}
				}
				return
			case "RestElement":
				return this.bindPattern(pattern.argument, module, held)
		}
	}

	// a member read off the validator or its ~standard by destructuring
	private readMember(
		key: string | undefined,
		held: Held,
		at: Node,
		module: SourceModule
	): Held | undefined {
		if (key === undefined) {
			if (held.of === "standard")
				this.record("~standard.jsonSchema", at, module)
			else this.lose(at, module, "reads it at a computed key")
			return
		}
		if (held.of === "standard") {
			if (key === "jsonSchema") this.record("~standard.jsonSchema", at, module)
			return
		}
		if (key === "~standard") return { path: [], of: "standard" }
		if (key === "toString") this.record("expression", at, module)
		else if (introspectionMembers.includes(key as never))
			this.record(key as IntrospectionMember, at, module)
	}

	private bindLeft(left: Node, module: SourceModule, held: Held): void {
		if (left.type === "VariableDeclaration") {
			for (const declarator of left.declarations)
				this.bindPattern(declarator.id, module, held)
		} else this.write(left, module, held)
	}

	private readBinding(
		binding: Binding,
		module: SourceModule,
		held: Held
	): void {
		const runtime = this.readers.runtimeOf(module)
		for (const reference of binding.references) {
			if (reference.isWrite || (runtime && isDead(reference.id, runtime)))
				continue
			const [operand, parent] = operatorOf(reference.id)
			// read by importers through the export
			if (
				parent?.type === "ExportSpecifier" ||
				(parent?.type === "ExportDefaultDeclaration" &&
					parent.declaration === operand)
			)
				continue
			this.push(reference.id, module, held)
		}
		for (const name of binding.exportNames)
			this.readExport(module, name, held, binding.id)
	}

	private readExport(
		module: SourceModule,
		name: string,
		held: Held,
		at: Node
	): void {
		const key = `${module.id}\0${name}\0${heldKeyOf(held)}`
		if (this.exports.has(key)) return
		this.exports.add(key)
		const { program } = this.readers
		if (!this.readers.runtimeOf(module))
			return this.lose(at, module, `exports it as ${name} from a dependency`)
		if (program.entries.has(module.id) || program.exposed.has(module.id)) {
			this.unseen.push(
				`${module.path} exports ${name}, which code outside the bundle may read`
			)
			return
		}
		if (!program.whole) {
			return this.lose(
				at,
				module,
				`exports it as ${name}, which a build reading one module at a time can't follow`
			)
		}
		for (const edge of this.readers.importersOf(module.id)) {
			switch (edge.kind) {
				case "named":
					if (edge.name === name)
						this.readBinding(edge.binding, edge.module, held)
					break
				case "namespace":
					for (const reference of edge.binding.references) {
						const [operand, parent] = operatorOf(reference.id)
						if (
							parent?.type === "MemberExpression" &&
							parent.object === operand
						) {
							const read = memberNameOf(parent)
							if (read === undefined) this.push(parent, edge.module, held)
							else if (read === name) this.push(parent, edge.module, held)
						} else if (!reference.isWrite) {
							this.push(reference.id, edge.module, {
								...held,
								path: [name, ...held.path]
							})
						}
					}
					break
				case "reexport":
					if (edge.name === name)
						this.readExport(edge.module, edge.as, held, at)
					break
				case "star":
					if (name !== "default") this.readExport(edge.module, name, held, at)
					break
				case "whole":
					this.lose(
						at,
						module,
						`exports it, and ${edge.at} loads its module whole`
					)
			}
		}
	}

	// a call to a global the build knows, or undefined
	private builtin(
		call: Extract<Node, { type: "CallExpression" | "NewExpression" }>,
		callee: Node,
		index: number,
		module: SourceModule,
		held: Held
	): boolean {
		const name = globalNameOf(callee, module)
		if (name === undefined) return false
		const isValue = !held.path.length
		switch (name) {
			case "JSON.stringify":
				if (index === 0) {
					if (held.of === "standard")
						this.record("~standard.jsonSchema", call, module)
					else this.record("toJSON", call, module)
				}
				return true
			case "String":
				if (isValue && held.of === "type")
					this.record("expression", call, module)
				return true
			case "Object.freeze":
			case "Object.seal":
			case "Promise.resolve":
			case "Array.from":
				if (index === 0) this.push(call, module, held)
				return true
			case "Object.values":
			case "Object.entries":
				if (isValue)
					return (this.lose(call, module, "copies its members"), true)
				this.push(call, module, {
					...held,
					path:
						name === "Object.values" ?
							[anyKey, ...held.path.slice(1)]
						:	[anyKey, "1", ...held.path.slice(1)]
				})
				return true
			case "Object.assign":
				if (isValue)
					return (this.lose(call, module, "copies its members"), true)
				if (index === 0) this.push(call, module, held)
				else {
					this.push(call, module, held)
					this.write(call.arguments[0], module, held)
				}
				return true
			case "Object.keys":
			case "Object.getOwnPropertyNames":
			case "Object.is":
			case "Array.isArray":
			case "Boolean":
			case "Number.isFinite":
			case "console.log":
			case "console.warn":
			case "console.error":
				return true
		}
		return false
	}

	private calleeOf(
		call: Extract<Node, { type: "CallExpression" | "NewExpression" }>,
		module: SourceModule
	): Extract<Value, { kind: "function" }> | undefined {
		const value = this.valueOf(call.callee, module)
		if (call.type === "NewExpression")
			return value?.kind === "class" ? this.constructorOf(value) : undefined
		return value?.kind === "function" ? value : undefined
	}

	private constructorOf(
		value: Extract<Value, { kind: "class" | "instance" }>,
		depth = 0
	): Extract<Value, { kind: "function" }> | undefined {
		for (const element of value.cls.body.body) {
			if (element.type === "MethodDefinition" && element.kind === "constructor")
				return { kind: "function", fn: element.value, module: value.module }
		}
		const parent =
			value.cls.superClass && depth < 16 ?
				this.valueOf(value.cls.superClass, value.module)
			:	undefined
		return parent?.kind === "class" ?
				this.constructorOf(parent, depth + 1)
			:	undefined
	}

	private methodOf(
		value: Extract<Value, { kind: "class" | "instance" }>,
		name: string,
		depth = 0
	): Extract<Value, { kind: "function" }> | undefined {
		const isStatic = value.kind === "class"
		for (const element of value.cls.body.body) {
			if (
				(element.type !== "MethodDefinition" &&
					element.type !== "PropertyDefinition") ||
				element.static !== isStatic ||
				propertyKeyOf(element) !== name
			)
				continue
			if (element.type === "MethodDefinition") {
				return element.kind === "method" ?
						{ kind: "function", fn: element.value, module: value.module }
					:	undefined
			}
			const fn = element.value && unwrapExpression(element.value)
			return fn && isFunctionNode(fn) ?
					{ kind: "function", fn, module: value.module }
				:	undefined
		}
		const parent =
			value.cls.superClass && depth < 16 ?
				this.valueOf(value.cls.superClass, value.module)
			:	undefined
		return parent?.kind === "class" ?
				this.methodOf({ ...parent, kind: value.kind }, name, depth + 1)
			:	undefined
	}

	// what an expression evaluates to, where the build can tell
	private valueOf(
		node: Node,
		module: SourceModule,
		depth = 0
	): Value | undefined {
		if (depth > 32) return
		node = unwrapExpression(node)
		switch (node.type) {
			case "FunctionExpression":
			case "ArrowFunctionExpression":
			case "FunctionDeclaration":
				return { kind: "function", fn: node, module }
			case "ClassExpression":
			case "ClassDeclaration":
				return { kind: "class", cls: node, module }
			case "ObjectExpression":
				return { kind: "object", literal: node, module }
			case "NewExpression": {
				const cls = this.valueOf(node.callee, module, depth + 1)
				return cls?.kind === "class" ? { ...cls, kind: "instance" } : undefined
			}
			case "ThisExpression": {
				const cls = enclosingClassOf(node)
				return cls && { kind: "instance", cls, module }
			}
			case "Identifier": {
				const binding = module.scopes.byId.get(node)?.binding
				return binding && this.bindingValueOf(binding, module, depth)
			}
			case "MemberExpression": {
				const name = memberNameOf(node)
				if (typeof name !== "string") return
				const object = this.valueOf(node.object, module, depth + 1)
				if (!object) return
				if (object.kind === "namespace")
					return this.exportValueOf(object.module, name, depth + 1)
				if (object.kind === "object") {
					const property = propertyOf(object.literal, name)
					return property && this.valueOf(property, object.module, depth + 1)
				}
				if (object.kind === "function") return
				return this.methodOf(object, name)
			}
			case "CallExpression": {
				// a builder's method returning `this`, like Elysia's .use()
				const callee = this.valueOf(node.callee, module, depth + 1)
				if (callee?.kind !== "function") return
				const returned = returnsOf(callee.fn)
				if (!returned.length) return
				const values = returned.map(r =>
					this.valueOf(r, callee.module, depth + 1)
				)
				const [first] = values
				return (
						first &&
							first.kind === "instance" &&
							values.every(v => v?.kind === "instance" && v.cls === first.cls)
					) ?
						first
					:	undefined
			}
		}
	}

	private bindingValueOf(
		binding: Binding,
		module: SourceModule,
		depth: number
	): Value | undefined {
		const { declaration } = binding
		switch (binding.kind) {
			case "function":
				return isFunctionNode(declaration) ?
						{ kind: "function", fn: declaration, module }
					:	undefined
			case "class":
				return declaration.type === "ClassDeclaration" ?
						{ kind: "class", cls: declaration, module }
					:	undefined
			case "const":
			case "let":
			case "var":
				if (
					binding.writes.length > 1 ||
					declaration.type !== "VariableDeclarator" ||
					declaration.id !== binding.id ||
					!declaration.init
				)
					return
				return this.valueOf(declaration.init, module, depth + 1)
			case "import": {
				const statement = declaration.parent
				if (statement?.type !== "ImportDeclaration") return
				const target = this.readers.resolve(statement.source.value, module)
				if (!target) return
				return declaration.type === "ImportNamespaceSpecifier" ?
						{ kind: "namespace", module: target }
					:	this.exportValueOf(
							target,
							declaration.type === "ImportSpecifier" ?
								exportNameOf(declaration.imported)
							:	"default",
							depth + 1
						)
			}
		}
	}

	private exportValueOf(
		module: SourceModule,
		name: string,
		depth: number
	): Value | undefined {
		if (depth > 32) return
		const entry = module.scopes.exportsByName[name]
		if (entry) {
			switch (entry.kind) {
				case "binding":
					return this.bindingValueOf(entry.binding, module, depth)
				case "expression":
					return this.valueOf(entry.node, module, depth + 1)
				case "reexport":
				case "namespace": {
					const target = this.readers.resolve(entry.specifier, module)
					if (!target) return
					return entry.kind === "namespace" ?
							{ kind: "namespace", module: target }
						:	this.exportValueOf(target, entry.name, depth + 1)
				}
			}
		}
		if (name === "default") return
		for (const specifier of module.scopes.starExports) {
			const target = this.readers.resolve(specifier, module)
			const value = target && this.exportValueOf(target, name, depth + 1)
			if (value) return value
		}
	}
}

// the node a site spans
export const nodeAt = (module: SourceModule, span: Span): Node | undefined => {
	let result: Node | undefined
	walk(module.program, node => {
		if (result) return false
		if (node.start === span.start && node.end === span.end) result = node
		return node.start <= span.start && span.end <= node.end
	})
	return result
}

// how deep in what holds it the build follows a validator
const maxDepth = 8

// how many ways one expression may hold it, and how many reads of it the
// build follows, before it bakes every member
const maxHelds = 8
const maxFacts = 20_000

type Abstract =
	| { kind: "held"; of: Held["of"] }
	| { kind: "value"; value: unknown }
	| { kind: "object" | "function" | "symbol" }

const truthinessOf = (value: Abstract | undefined): boolean | undefined =>
	!value ? undefined
	: value.kind === "value" ? !!value.value
	: true

const typeOfAbstract = (value: Abstract | undefined): string | undefined =>
	!value ? undefined
	: value.kind === "held" ?
		value.of === "type" ?
			"function"
		:	"object"
	: value.kind === "value" ?
		value.value === null ?
			"object"
		:	typeof value.value
	:	value.kind

// whether two values a guard compares are equal, where it can tell
const equalityOf = (
	l: Abstract | undefined,
	r: Abstract | undefined,
	strict: boolean
): boolean | undefined => {
	if (!l || !r) return
	if (l.kind === "value" && r.kind === "value")
		// eslint-disable-next-line eqeqeq
		return strict ? l.value === r.value : l.value == r.value
	// an object is never a primitive
	if (l.kind === "value" || r.kind === "value") {
		const value = l.kind === "value" ? l.value : (r as { value: unknown }).value
		return value === null || typeof value !== "object" ? false : undefined
	}
	if (l.kind === "held" && r.kind === "held") return l.of === r.of
}

// a validator's own members and those it inherits, as `in` finds them
const validatorKeys = new Set([
	"assert",
	"allows",
	"~standard",
	"meta",
	"traverse",
	"from",
	...introspectionMembers.filter(member => member !== "~standard.jsonSchema"),
	...Object.getOwnPropertyNames(Function.prototype),
	...Object.getOwnPropertyNames(Object.prototype)
])

const standardKeys = new Set([
	"vendor",
	"version",
	"validate",
	"jsonSchema",
	...Object.getOwnPropertyNames(Object.prototype)
])

const hasMember = (of: Held["of"], name: string): boolean =>
	(of === "type" ? validatorKeys : standardKeys).has(name)

const memberOfHeld = (of: Held["of"], name: string): Abstract | undefined => {
	if (!hasMember(of, name)) return { kind: "value", value: undefined }
	if (of === "type") {
		if (name === "~standard") return { kind: "held", of: "standard" }
		if (name === "meta") return { kind: "object" }
		return introspectionMembers.includes(name as never) ? undefined : (
				{ kind: "function" }
			)
	}
	return (
		name === "vendor" ? { kind: "value", value: "arktype" }
		: name === "version" ? { kind: "value", value: 1 }
		: name === "jsonSchema" ? undefined
		: { kind: "function" }
	)
}

// a statement ending in return or throw
const exits = (statement: Node): boolean => {
	const last =
		statement.type === "BlockStatement" ?
			statement.body[statement.body.length - 1]
		:	statement
	return last?.type === "ReturnStatement" || last?.type === "ThrowStatement"
}

const wrapped = (held: Held, wrap: readonly Key[]): Held =>
	wrap.length ? { ...held, path: [...wrap, ...held.path] } : held

// what each array method returns of its receiver: itself, an element or what its callback maps
const arrayMethods: Record<string, "holder" | "element" | "mapped" | "none"> =
	Object.assign(Object.create(null), {
		filter: "holder",
		slice: "holder",
		concat: "holder",
		reverse: "holder",
		sort: "holder",
		toSorted: "holder",
		toReversed: "holder",
		find: "element",
		findLast: "element",
		at: "element",
		pop: "element",
		shift: "element",
		map: "mapped",
		flatMap: "mapped",
		forEach: "none",
		some: "none",
		every: "none",
		findIndex: "none",
		findLastIndex: "none",
		includes: "none",
		indexOf: "none",
		reduce: "none",
		join: "none"
	})

// e.g. `JSON.stringify`, where no binding shadows the global
const globalObjects = new Set(["globalThis", "window", "self", "global"])

const globalNameOf = (
	callee: Node,
	module: SourceModule
): string | undefined => {
	const root =
		callee.type === "MemberExpression" ?
			unwrapExpression(callee.object)
		:	callee
	if (root.type !== "Identifier" || module.scopes.byId.get(root)?.binding)
		return
	if (callee.type === "Identifier") return callee.name
	const name = memberNameOf(
		callee as Extract<Node, { type: "MemberExpression" }>
	)
	return typeof name === "string" ? `${root.name}.${name}` : undefined
}

const propertyKeyOf = (property: {
	key: Node
	computed: boolean
}): string | undefined =>
	property.key.type === "Literal" ?
		(
			typeof property.key.value === "string" ||
			typeof property.key.value === "number"
		) ?
			String(property.key.value)
		:	undefined
	: property.computed || property.key.type !== "Identifier" ? undefined
	: property.key.name

// a key a const holds, like `const io = "input"`
const constantOf = (node: Node, module: SourceModule): string | undefined => {
	node = unwrapExpression(node)
	if (node.type === "Literal") {
		return typeof node.value === "string" || typeof node.value === "number" ?
				String(node.value)
			:	undefined
	}
	if (node.type === "TemplateLiteral" && !node.expressions.length)
		return node.quasis[0].value.cooked ?? undefined
	if (node.type !== "Identifier") return
	const binding = module.scopes.byId.get(node)?.binding
	const declaration = binding?.declaration
	return (
			binding?.kind === "const" &&
				declaration?.type === "VariableDeclarator" &&
				declaration.id === binding.id &&
				declaration.init
		) ?
			constantOf(declaration.init, module)
		:	undefined
}

const propertyOf = (literal: Node, name: string): Node | undefined => {
	if (literal.type !== "ObjectExpression") return
	for (const property of literal.properties) {
		if (
			property.type === "Property" &&
			property.kind === "init" &&
			propertyKeyOf(property) === name
		)
			return property.value
	}
}

// `{ a: x } = o` or `({ a: x }) =>`, binding x
const isPatternTarget = (node: Node): boolean =>
	node.parent?.type === "ObjectPattern" || node.parent?.type === "ArrayPattern"

const enclosingFunctionOf = (node: Node): FunctionNode | undefined => {
	for (let at = node.parent; at; at = at.parent)
		if (isFunctionNode(at)) return at
}

const enclosingClassOf = (node: Node): Class | undefined => {
	for (let at = node.parent; at; at = at.parent) {
		if (at.type === "FunctionExpression" || at.type === "FunctionDeclaration") {
			const owner = at.parent
			if (owner?.type !== "MethodDefinition") return
			const cls = owner.parent?.parent
			return (
					cls?.type === "ClassDeclaration" || cls?.type === "ClassExpression"
				) ?
					cls
				:	undefined
		}
		if (at.type === "PropertyDefinition") {
			const cls = at.parent?.parent
			return (
					cls?.type === "ClassDeclaration" || cls?.type === "ClassExpression"
				) ?
					cls
				:	undefined
		}
	}
}

// each value a function returns, its body's if an arrow's
const returnsOf = (fn: FunctionNode): Node[] => {
	if (!fn.body) return []
	if (fn.body.type !== "BlockStatement") return [fn.body]
	const result: Node[] = []
	walk(fn.body, node => {
		if (
			isFunctionNode(node) ||
			node.type === "ClassDeclaration" ||
			node.type === "ClassExpression"
		)
			return false
		if (node.type === "ReturnStatement" && node.argument)
			result.push(node.argument)
		return true
	})
	return result
}

const readsArguments = (fn: FunctionNode): boolean => {
	if (fn.type === "ArrowFunctionExpression" || !fn.body) return false
	let reads = false
	walk(fn.body, node => {
		if (reads) return false
		if (
			node.type === "FunctionExpression" ||
			node.type === "FunctionDeclaration"
		)
			return false
		reads = node.type === "Identifier" && node.name === "arguments"
		return true
	})
	return reads
}
