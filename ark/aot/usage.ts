import { receiverPrefix } from "arktype/internal/standalone.ts"
import type { Node, Program, Span } from "oxc-parser"
import { isFunctionNode, memberNameOf } from "./graph.ts"
import type { SiteFactory } from "./fold.ts"
import { parseCode, type SourceModule } from "./module.ts"
import { isInertMetaProperty } from "./scan.ts"
import {
	exportNameOf,
	isWriteTarget,
	operatorOf,
	propertyKeyOf,
	unwrapExpression,
	walk,
	type Binding
} from "./scope.ts"
import type { Site } from "./sites.ts"

// a member, "call" where it may return errors no one reads, "piped" where a
// call may pass a second argument, "summary" where a call's errors have theirs
// read, "errors" where they may be read in any other way, or "thrown" where
// code may name TraversalError, the class of what an assert throws
export type UsedMember =
	| "assert"
	| "~standard"
	| "meta"
	| "methods"
	| "withContext"
	| "allows"
	| "call"
	| "piped"
	| "summary"
	| "errors"
	| "thrown"

const usedMembersByName: Record<string, UsedMember | null> =
	Object.setPrototypeOf(
		{
			allows: "allows",
			assert: "assert",
			"~standard": "~standard",
			meta: "meta",
			traverse: "methods",
			from: "methods",
			withContext: "withContext",
			toString: "methods"
		},
		null
	)

// a module of a bundle as its precompiled code runs
export interface RuntimeModule {
	module: SourceModule
	folded: Span[]
	// text inside them a site's call keeps
	kept: Span[]
	passed: Binding[]
	// what factories import from other modules, by specifier
	inputs: Record<string, string[]>
	validators: Span[]
	// sites creating a Module, which holds validators at its keys
	modules: Span[]
	// a site creating a Module, Scope or Generic, which holds validators
	holdsOther: boolean
	// what each site's factory receives
	factories: ReadonlyMap<Site, SiteFactory>
}

export interface UsageProgram {
	entries: ReadonlySet<string>
	// e.g. a module a framework's runtime imports, as its exports are read
	exposed: ReadonlySet<string>
	// whether what a computed import() or require() may load is among them
	exposesLoaded?: boolean
	modules: ReadonlyMap<string, RuntimeModule>
	// the module a specifier resolves to, if the program holds it
	resolve: (specifier: string, importer: string) => string | undefined
	// every module the program reaches through its imports, dependencies
	// included, which code reading a validator through `this` may be in
	reached?: () => Iterable<SourceModule>
}

export interface ProgramUse {
	used: Set<UsedMember>
	// where a validator first reaches code this doesn't follow, which
	// readers.ts follows instead
	handedOff: string | undefined
}

// the members some read needs, or why the program may read anything
export const usedMembersOf = (program: UsageProgram): ProgramUse | string => {
	const analysis = new UsageAnalysis(program)
	try {
		analysis.analyze()
	} catch (e) {
		if (e instanceof Escape) return e.reason
		throw e
	}
	return { used: analysis.used, handedOff: analysis.handedOff }
}

class Escape {
	reason: string

	constructor(reason: string) {
		this.reason = reason
	}
}

const escape = (reason: string): never => {
	throw new Escape(reason)
}

type ImportEdge =
	| { kind: "named"; name: string; binding: Binding; importer: RuntimeModule }
	| { kind: "namespace"; binding: Binding; importer: RuntimeModule }
	| { kind: "reexport"; name: string; as: string; importer: RuntimeModule }
	| { kind: "star"; importer: RuntimeModule }
	// e.g. import(), require() or `export * as ns`, handing over every export
	| { kind: "whole"; at: string; how: (path: string) => string }
	// read by a factory, which may read anything off it
	| { kind: "input"; name: string }

class UsageAnalysis {
	used = new Set<UsedMember>()
	handedOff: string | undefined
	private program: UsageProgram
	private edgesByTarget = new Map<string, ImportEdge[]>()
	// each binding read, by the path of keys the validator is held at in it
	private readBindings = new Map<Binding, Set<string>>()
	private readExports = new Set<string>()
	// e.g. `type.errors` in `out instanceof type.errors`
	private errorsTests = new Set<Node>()
	// each arktype export a module re-exports, as `name` re-exported `as`
	private arkReexports: [runtime: RuntimeModule, as: string, name: string][] =
		[]

	private reads: ThisReads | undefined

	constructor(program: UsageProgram) {
		this.program = program
	}

	private get thisReads(): ThisReads {
		return (this.reads ??= thisReadsOf(
			this.program.reached?.() ??
				[...this.program.modules.values()].map(runtime => runtime.module)
		))
	}

	analyze(): void {
		for (const runtime of this.program.modules.values()) this.link(runtime)
		for (const [runtime, as, name] of this.arkReexports)
			this.readArkExport(runtime, as, name, new Set())
		for (const runtime of this.program.modules.values()) {
			if (runtime.holdsOther) {
				escape(
					`${runtime.module.path} creates a Scope, Module or Generic, whose validators it can't follow`
				)
			}
			for (const node of nodesAt(runtime.module, runtime.validators))
				this.readValue(node, runtime)
		}
	}

	private link(runtime: RuntimeModule): void {
		const { module } = runtime
		const add = (specifier: string, edge: ImportEdge) => {
			// e.g. `export * as ark from "arktype"`, whose errors class is read unfollowed
			if (
				(edge.kind === "whole" || edge.kind === "star") &&
				isArkSpecifier(specifier)
			) {
				this.used.add("errors")
				this.used.add("thrown")
			}
			const id = this.program.resolve(specifier, module.id)
			if (id === undefined) return
			const edges = this.edgesByTarget.get(id)
			if (edges) edges.push(edge)
			else this.edgesByTarget.set(id, [edge])
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
					if (isArkSpecifier(statement.source.value)) {
						this.readArkImport(
							specifier.type === "ImportSpecifier" ?
								exportNameOf(specifier.imported)
							:	undefined,
							binding,
							runtime
						)
					}
					add(
						statement.source.value,
						specifier.type === "ImportNamespaceSpecifier" ?
							{ kind: "namespace", binding, importer: runtime }
						:	{
								kind: "named",
								name:
									specifier.type === "ImportDefaultSpecifier" ?
										"default"
									:	exportNameOf(specifier.imported),
								binding,
								importer: runtime
							}
					)
				}
			} else if (statement.type === "ExportNamedDeclaration") {
				if (!statement.source || statement.exportKind === "type") continue
				for (const specifier of statement.specifiers) {
					if (specifier.exportKind === "type") continue
					if (isArkSpecifier(statement.source.value)) {
						this.arkReexports.push([
							runtime,
							exportNameOf(specifier.exported),
							exportNameOf(specifier.local)
						])
					}
					add(statement.source.value, {
						kind: "reexport",
						name: exportNameOf(specifier.local),
						as: exportNameOf(specifier.exported),
						importer: runtime
					})
				}
			} else if (statement.type === "ExportAllDeclaration") {
				if (statement.exportKind === "type") continue
				add(
					statement.source.value,
					statement.exported ?
						{
							kind: "whole",
							at: module.positionOf(statement),
							how: path => `re-exports ${path} as a namespace`
						}
					:	{ kind: "star", importer: runtime }
				)
			} else if (statement.type === "TSImportEqualsDeclaration") {
				if (statement.moduleReference.type === "TSExternalModuleReference") {
					add(statement.moduleReference.expression.value, {
						kind: "whole",
						at: module.positionOf(statement),
						how: path => `loads ${path} by import =`
					})
				}
			}
		}
		for (const specifier in runtime.inputs) {
			for (const name of runtime.inputs[specifier])
				add(specifier, { kind: "input", name })
		}
		for (const { id, binding } of module.scopes.root.unresolved) {
			if (binding) continue
			// direct eval reads any binding in scope
			if (id.name === "eval") {
				escape(
					`${module.positionOf(id)} calls eval, which may read any binding`
				)
			}
			if (id.name !== "require") continue
			const [operand, parent] = operatorOf(id)
			const isCalled =
				parent?.type === "CallExpression" && parent.callee === operand
			const specifier = isCalled ? literalOf(parent.arguments[0]) : undefined
			if (specifier === undefined) {
				// each module it may load is one code outside the program may
				// read any way, as the bundler that built them has it
				if (isCalled && this.program.exposesLoaded) continue
				return escape(
					`${module.positionOf(id)} reads require other than to call it with a string`
				)
			}
			add(specifier, {
				kind: "whole",
				at: module.positionOf(id),
				how: path => `loads ${path} by require()`
			})
		}
		walk(module.program, node => {
			if (node.type === "ImportExpression") {
				const specifier = literalOf(node.source)
				if (specifier === undefined) {
					if (this.program.exposesLoaded) return true
					return escape(
						`${module.positionOf(node)} imports a module by a computed specifier`
					)
				}
				add(specifier, {
					kind: "whole",
					at: module.positionOf(node),
					how: path => `loads ${path} by import()`
				})
			} else if (
				node.type === "MetaProperty" &&
				node.meta.name === "import" &&
				!isInertMetaRead(node)
			) {
				// e.g. import.meta.glob(), reaching modules unseen
				const name =
					node.parent?.type === "MemberExpression" ?
						memberNameOf(node.parent)
					:	undefined
				escape(
					`${module.positionOf(node)} ${typeof name === "string" ? `reads import.meta.${name}, which may load modules it can't name` : "reads import.meta whole"}`
				)
			}
			return true
		})
	}

	// arktype's export `name` re-exported as `as`, read where it's imported
	private readArkExport(
		runtime: RuntimeModule,
		as: string,
		name: string,
		seen: Set<string>
	): void {
		const { id } = runtime.module
		const key = `${id}\0${as}`
		if (seen.has(key)) return
		seen.add(key)
		// whoever reads it
		if (name === "TraversalError") this.used.add("thrown")
		// code outside the bundle may read it
		if (this.program.entries.has(id) || this.program.exposed.has(id))
			this.used.add("errors")
		for (const edge of this.edgesByTarget.get(id) ?? []) {
			switch (edge.kind) {
				case "named":
					if (edge.name === as)
						this.readArkImport(name, edge.binding, edge.importer)
					break
				case "reexport":
					if (edge.name === as)
						this.readArkExport(edge.importer, edge.as, name, seen)
					break
				case "star":
					if (as !== "default")
						this.readArkExport(edge.importer, as, name, seen)
					break
				case "input":
					if (edge.name === as) this.used.add("errors")
					break
				// what reads a namespace or a whole module isn't followed
				default:
					this.used.add("errors")
			}
		}
	}

	// arktype's export, as what it may hand a program of the errors class, or
	// undefined for its default or namespace
	private readArkImport(
		name: string | undefined,
		binding: Binding,
		runtime: RuntimeModule
	): void {
		if (name !== "type" && name !== "ArkErrors") {
			this.used.add("errors")
			// the class itself, or a default or namespace it's read off
			if (name === undefined || name === "TraversalError")
				this.used.add("thrown")
			return
		}
		for (const { id } of binding.references) {
			if (isDead(id, runtime)) continue
			let [operand, parent] = operatorOf(id)
			if (name === "type") {
				if (parent?.type === "CallExpression" && parent.callee === operand)
					continue
				if (
					parent?.type !== "MemberExpression" ||
					parent.object !== operand ||
					isWriteTarget(parent)
				) {
					this.used.add("errors")
					continue
				}
				if (memberNameOf(parent) !== "errors") continue
				;[operand, parent] = operatorOf(parent)
			}
			if (
				parent?.type === "BinaryExpression" &&
				parent.operator === "instanceof" &&
				parent.right === operand
			)
				this.errorsTests.add(operand)
			else this.used.add("errors")
		}
	}

	// a call's result, which holds errors unless it's past a test for them
	private readResult(call: Node, runtime: RuntimeModule): void {
		const [result, parent] = operatorOf(call)
		if (parent?.type === "ExpressionStatement") return
		if (
			parent?.type !== "VariableDeclarator" ||
			parent.init !== result ||
			parent.id.type !== "Identifier"
		)
			return this.readErrors(result, parent)
		const binding = runtime.module.scopes.bindingsById.get(parent.id)!
		if (
			binding.kind !== "const" ||
			binding.exportNames.length ||
			runtime.passed.includes(binding)
		) {
			this.used.add("errors")
			return
		}
		for (const { id } of binding.references) {
			if (isDead(id, runtime) || this.isPastErrorsTest(id, binding)) continue
			const [operand, operator] = operatorOf(id)
			this.readErrors(operand, operator)
		}
	}

	private readErrors(node: Node, parent: Node | null | undefined): void {
		if (this.isErrorsTest(parent, node)) return
		if (
			parent?.type === "MemberExpression" &&
			parent.object === node &&
			!isWriteTarget(parent)
		) {
			const name = memberNameOf(parent)
			if (name === "issues" || name === "count") return
			if (name === "summary") {
				this.used.add("summary")
				return
			}
		}
		this.used.add("errors")
	}

	private isErrorsTest(test: Node | null | undefined, tested: Node): boolean {
		return (
			test?.type === "BinaryExpression" &&
			test.operator === "instanceof" &&
			test.left === tested &&
			this.errorsTests.has(test.right)
		)
	}

	// e.g. `data` in `out instanceof type.errors ? out.issues : { data }`, or
	// anywhere after `if (out instanceof type.errors) return out.issues`
	private isPastErrorsTest(read: Node, binding: Binding): boolean {
		const tests = (test: Node): boolean => {
			const expression = unwrapExpression(test) as Node
			return (
				expression.type === "BinaryExpression" &&
				this.isErrorsTest(expression, unwrapExpression(expression.left)) &&
				binding.references.some(
					({ id }) => id === unwrapExpression(expression.left)
				)
			)
		}
		const refutes = (test: Node): boolean => {
			const expression = unwrapExpression(test) as Node
			return (
				expression.type === "UnaryExpression" &&
				expression.operator === "!" &&
				tests(expression.argument)
			)
		}
		let node = read
		for (
			let parent = node.parent;
			parent;
			node = parent, parent = node.parent
		) {
			// hoisted, so it may run before any test
			if (parent.type === "FunctionDeclaration") return false
			if (
				parent.type === "ConditionalExpression" ||
				parent.type === "IfStatement"
			) {
				if (node === parent.alternate && tests(parent.test)) return true
				if (node === parent.consequent && refutes(parent.test)) return true
			} else if (
				parent.type === "BlockStatement" ||
				parent.type === "Program"
			) {
				const body = parent.body as Node[]
				if (
					body
						.slice(0, body.indexOf(node))
						.some(
							statement =>
								statement.type === "IfStatement" &&
								!statement.alternate &&
								tests(statement.test) &&
								leaves(statement.consequent)
						)
				)
					return true
			}
		}
		return false
	}

	// a validator, or an object literal holding one at path, as a value
	private readValue(
		node: Node,
		runtime: RuntimeModule,
		path: readonly string[] = []
	): void {
		const [operand, parent] = operatorOf(node)
		const declaration = parent?.parent
		if (
			parent?.type === "VariableDeclarator" &&
			parent.init === operand &&
			parent.id.type === "Identifier" &&
			declaration?.type === "VariableDeclaration" &&
			declaration.kind === "const"
		) {
			// a namespace's export is read off the namespace
			if (
				declaration.parent?.type === "ExportNamedDeclaration" &&
				declaration.parent.parent?.type !== "Program"
			) {
				escape(
					`${runtime.module.positionOf(declaration)} exports a validator from a namespace`
				)
			}
			return this.readBinding(
				runtime.module.scopes.bindingsById.get(parent.id)!,
				runtime,
				path
			)
		}
		this.read(operand, parent, runtime, path)
	}

	private readBinding(
		binding: Binding,
		runtime: RuntimeModule,
		path: readonly string[] = []
	): void {
		const paths = this.readBindings.get(binding)
		const key = path.join(".")
		if (paths?.has(key)) return
		if (paths) paths.add(key)
		else this.readBindings.set(binding, new Set([key]))
		const { module } = runtime
		const write =
			binding.writes[0] ??
			binding.references.find(reference => reference.isWrite)?.id
		if (write) {
			escape(
				`${module.positionOf(write)} assigns ${binding.name}, which holds a validator`
			)
		}
		if (binding.kind !== "const" && binding.kind !== "import") {
			escape(
				`${module.positionOf(binding.id)} holds a validator in ${binding.name}, which isn't a const`
			)
		}
		if (runtime.passed.includes(binding)) {
			escape(
				`${module.positionOf(binding.id)} passes ${binding.name} to a factory that checks it, which may read any member`
			)
		}
		for (const reference of binding.references) {
			if (isDead(reference.id, runtime)) continue
			const [operand, parent] = operatorOf(reference.id)
			// read by importers through the export
			if (
				parent?.type === "ExportSpecifier" ||
				parent?.type === "ExportDefaultDeclaration"
			)
				continue
			this.read(operand, parent, runtime, path)
		}
		for (const name of binding.exportNames) this.readExport(runtime, name, path)
	}

	private readExport(
		runtime: RuntimeModule,
		name: string,
		path: readonly string[] = []
	): void {
		const id = runtime.module.id
		const key = `${id}\0${name}\0${path.join(".")}`
		if (this.readExports.has(key)) return
		this.readExports.add(key)
		if (this.program.entries.has(id)) {
			escape(
				`${runtime.module.path} exports ${name}, which code outside the bundle may read`
			)
		}
		if (this.program.exposed.has(id)) {
			escape(
				`${runtime.module.path} exports ${name}, which a dependency may read`
			)
		}
		for (const edge of this.edgesByTarget.get(id) ?? []) {
			switch (edge.kind) {
				case "named":
					if (edge.name === name)
						this.readBinding(edge.binding, edge.importer, path)
					break
				case "namespace":
					this.readNamespace(edge.binding, edge.importer, name, path)
					break
				case "reexport":
					if (edge.name === name) this.readExport(edge.importer, edge.as, path)
					break
				case "star":
					if (name !== "default") this.readExport(edge.importer, name, path)
					break
				case "whole":
					escape(
						`${edge.at} ${edge.how(runtime.module.path)}, which may read its ${name} any way`
					)
					break
				case "input":
					if (edge.name === name) {
						escape(
							`${runtime.module.path}'s ${name} is passed to a factory, which may read any member`
						)
					}
			}
		}
	}

	// `ns.T` reads the export, and nothing else may read the namespace
	private readNamespace(
		binding: Binding,
		runtime: RuntimeModule,
		name: string,
		path: readonly string[]
	): void {
		const { module } = runtime
		const wholeRead = `reads the namespace ${binding.name}, which holds ${name}, whole`
		if (binding.exportNames.length || runtime.passed.includes(binding))
			escape(`${module.positionOf(binding.id)} ${wholeRead}`)
		for (const reference of binding.references) {
			if (isDead(reference.id, runtime)) continue
			const [operand, parent] = operatorOf(reference.id)
			if (
				parent?.type !== "MemberExpression" ||
				parent.object !== operand ||
				isWriteTarget(parent)
			)
				return escape(`${module.positionOf(reference.id)} ${wholeRead}`)
			const read = memberNameOf(parent)
			if (typeof read !== "string") {
				return escape(
					`${module.positionOf(reference.id)} reads the namespace ${binding.name}, which holds ${name}, at a computed key`
				)
			}
			if (read !== name) continue
			const [member, memberParent] = operatorOf(parent)
			this.read(member, memberParent, runtime, path)
		}
	}

	// a read of a validator, or of an object holding one at path, e.g.
	// `schemas.user(data)` where `const schemas = { user: User }`
	private read(
		node: Node,
		parent: Node | null | undefined,
		runtime: RuntimeModule,
		path: readonly string[] = []
	): void {
		const { module } = runtime
		// passed to its site's factory, which finds the holes it holds by the
		// validator itself, reading no member
		if (runtime.kept.some(span => isSpan(node, span))) return
		// e.g. `import.meta.env.DEV ? DevPost : Post`, read as its result is
		if (
			(parent?.type === "ConditionalExpression" && parent.test !== node) ||
			parent?.type === "LogicalExpression"
		)
			return this.readValue(parent, runtime, path)
		// held in an object literal at a key, read off the object
		if (
			parent?.type === "Property" &&
			parent.value === node &&
			parent.kind === "init" &&
			!parent.method &&
			parent.parent?.type === "ObjectExpression"
		) {
			const key = propertyKeyOf(parent)
			if (
				key !== undefined &&
				(key === "__proto__" ||
					mayReadThrough(key, parent.parent, this.thisReads))
			)
				this.handedOff ??= `${module.positionOf(node)} holds a validator at ${key} of an object whose members may read it through this`

			if (key !== undefined)
				return this.readValue(parent.parent, runtime, [key, ...path])
		}
		if (path.length) return this.readHolder(node, parent, runtime, path)
		if (parent?.type === "CallExpression" && parent.callee === node) {
			this.used.add("call")
			this.readArguments(parent)
			this.readResult(parent, runtime)
			return
		}
		if (
			parent?.type === "MemberExpression" &&
			parent.object === node &&
			!isWriteTarget(parent)
		) {
			const name = memberNameOf(parent)
			if (typeof name === "string" && name in usedMembersByName) {
				const used = usedMembersByName[name]
				if (used) this.used.add(used)
				// a call by another name
				if (name === "traverse") this.used.add("call")
				// from(input) returns this.assert(input)
				if (name === "from") this.used.add("assert")
				// withContext(context) binds a call, assert, allows and ~standard
				if (name === "withContext") {
					this.used.add("call")
					this.used.add("allows")
					this.used.add("assert")
					this.used.add("~standard")
				}
				if (name === "assert" || name === "traverse") {
					const [method, call] = operatorOf(parent)
					if (call?.type === "CallExpression" && call.callee === method)
						this.readArguments(call)
					// read to be called elsewhere, with any arguments
					else this.used.add("piped")
				}
				return
			}
		}
		this.handedOff ??= `${module.positionOf(node)} ${unfollowedReadOf(node, parent, module)}`
	}

	// a read of an object holding a validator at path: on to the member at its
	// next key, or one at a computed key, which may be it
	private readHolder(
		node: Node,
		parent: Node | null | undefined,
		runtime: RuntimeModule,
		path: readonly string[]
	): void {
		const { module } = runtime
		if (
			parent?.type === "MemberExpression" &&
			parent.object === node &&
			!isWriteTarget(parent)
		) {
			const name = memberNameOf(parent)
			const [member, memberParent] = operatorOf(parent)
			const isCall =
				memberParent?.type === "CallExpression" &&
				memberParent.callee === member
			// returns its receiver, whatever it holds
			if (name === "valueOf" && path[0] !== name && isCall) {
				const [call, callParent] = operatorOf(memberParent)
				return this.read(call, callParent, runtime, path)
			}
			// a patched builtin prototype method or computed call (e.g. `o[k]()`,
			// where k may be "valueOf") needs Readers to follow or lose safely
			if (
				isCall &&
				((name === undefined && path.length > 0) ||
					(String(name) !== path[0] && this.thisReads.patchesBuiltins))
			) {
				this.handedOff ??= `${module.positionOf(node)} calls ${module.snippetOf(member)} on what holds a validator at ${path.join(".")}`
				return
			}
			if (
				(typeof name === "string" || typeof name === "number") &&
				String(name) !== path[0]
			)
				return
			return this.read(member, memberParent, runtime, path.slice(1))
		}
		const holder = `${module.snippetOf(node)}, which holds a validator at ${path.join(".")},`
		const passed =
			parent?.type === "CallExpression" || parent?.type === "NewExpression"
		this.handedOff ??= `${module.positionOf(node)} ${
			passed ?
				`passes ${holder} to a function, which may read any member`
			:	`reads ${holder} other than to read a member`
		}`
	}

	// a call's second argument is where its failure may pipe
	private readArguments(call: Extract<Node, { type: "CallExpression" }>): void {
		if (
			call.arguments.length > 1 ||
			call.arguments.some(arg => arg.type === "SpreadElement")
		)
			this.used.add("piped")
	}
}

const isArkSpecifier = (specifier: string): boolean =>
	specifier === "arktype" || specifier.startsWith("arktype/")

// no statement after it in its block runs
const leaves = (statement: Node): boolean =>
	statement.type === "BlockStatement" ?
		!!statement.body.length && leaves(statement.body[statement.body.length - 1])
	:	statement.type === "ReturnStatement" ||
		statement.type === "ThrowStatement" ||
		statement.type === "BreakStatement" ||
		statement.type === "ContinueStatement"

const literalOf = (node: Node | undefined): string | undefined =>
	node?.type === "Literal" && typeof node.value === "string" ? node.value
	: (
		node?.type === "TemplateLiteral" &&
		!node.expressions.length &&
		node.quasis[0].value.cooked !== null
	) ?
		node.quasis[0].value.cooked
	:	undefined

const unfollowedReadOf = (
	node: Node,
	parent: Node | null | undefined,
	module: SourceModule
): string => {
	const text = module.snippetOf(node)
	if (parent?.type === "CallExpression" || parent?.type === "NewExpression")
		return `passes ${text} to a function, which may read any member`
	if (parent?.type === "VariableDeclarator") {
		return parent.id.type === "Identifier" ?
				`holds ${text} in ${parent.id.name}, which isn't a const`
			:	`destructures ${text}`
	}
	if (parent?.type === "MemberExpression" && parent.object === node) {
		const name = memberNameOf(parent)
		return (
			isWriteTarget(parent) ? `writes to ${module.snippetOf(parent)}`
			: typeof name === "string" ?
				`reads ${module.snippetOf(parent)}, a member it doesn't know`
			:	`reads ${text} at a computed key`
		)
	}
	return `reads ${text} other than to call it or read a member it knows`
}

// e.g. import.meta.env.PROD, which loads nothing
const isInertMetaRead = (node: Node): boolean => {
	const parent = node.parent
	return (
		parent?.type === "MemberExpression" &&
		parent.object === node &&
		isInertMetaProperty(memberNameOf(parent))
	)
}

// inside a folded site, outside what its call keeps
export const isDead = (node: Span, runtime: RuntimeModule): boolean =>
	runtime.folded.some(span => isIn(node, span)) &&
	!runtime.kept.some(span => isIn(node, span))

const isIn = (node: Span, span: Span) =>
	span.start <= node.start && node.end <= span.end

export const isSpan = (node: Span, span: Span): boolean =>
	node.start === span.start && node.end === span.end

const nodesAt = (module: SourceModule, spans: Span[]): Node[] => {
	if (!spans.length) return []
	const nodesByRange = new Map(
		spans.map(span => [
			`${span.start}:${span.end}`,
			undefined as Node | undefined
		])
	)
	walk(module.program, node => {
		const range = `${node.start}:${node.end}`
		if (nodesByRange.has(range)) nodesByRange.set(range, node)
		return spans.some(span => isIn(span, node))
	})
	return [...nodesByRange.values()].map(
		node =>
			node ?? escape(`${module.path} holds a validator its sites don't name`)
	)
}

export const unprecompiled = (module: SourceModule): RuntimeModule => ({
	module,
	factories: new Map(),
	folded: [],
	kept: [],
	passed: [],
	inputs: {},
	validators: [],
	modules: [],
	holdsOther: false
})

// how a factory a module of validators reads a parameter: not at all, or as
// `receive1hche201(p0)`, which finds a Type's holes by its identity, reading
// none of its members; receiving what it holds at a path; or any way
export type PassedRead = "none" | "off" | "any"

// how each factory a module of validators exports reads a parameter, other
// than the index a shared factory takes first
export const passedReaderOf = (
	parse: () => Program
): ((exported: string, position: number) => PassedRead) => {
	let functionsByExport: Map<string, Node | undefined> | undefined
	const readsByExport = new Map<string, PassedReads | undefined>()
	return (exported, position) => {
		functionsByExport ??= exportedFunctionsOf(parse())
		if (!readsByExport.has(exported))
			readsByExport.set(exported, readsOf(functionsByExport.get(exported)))
		const reads = readsByExport.get(exported)
		return reads ? (reads.get(position) ?? "none") : "any"
	}
}

type PassedReads = Map<number, PassedRead>

const readsOf = (fn: Node | undefined): PassedReads | undefined => {
	if (!fn || !isFunctionNode(fn)) return
	const positions = new Map<string, number>()
	for (const [i, param] of fn.params.entries()) {
		if (param.type !== "Identifier") return
		if (i || param.name !== "index") positions.set(param.name, positions.size)
	}
	const reads: PassedReads = new Map()
	let readsArguments = false
	const add = (name: string, read: PassedRead) => {
		const at = positions.get(name)
		if (at !== undefined && reads.get(at) !== "any") reads.set(at, read)
	}
	walk(fn.body!, node => {
		const received = receivedOf(node)
		if (received) {
			if (received.type === "Identifier") return false
			const name = rootNameOf(received)
			if (name) {
				add(name, "off")
				return false
			}
		}
		if (node.type === "Identifier") {
			readsArguments ||= node.name === "arguments"
			add(node.name, "any")
		}
		return true
	})
	return readsArguments ? undefined : reads
}

const receivedOf = (node: Node): Node | undefined =>
	(
		node.type === "CallExpression" &&
		node.callee.type === "Identifier" &&
		node.callee.name.startsWith(receiverPrefix) &&
		node.arguments.length === 1
	) ?
		node.arguments[0]
	:	undefined

// e.g. p0 for `p0["user"]["name"]`
const rootNameOf = (node: Node): string | undefined =>
	node.type === "Identifier" ? node.name
	: node.type === "MemberExpression" && node.property.type === "Literal" ?
		rootNameOf(node.object)
	:	undefined

export const parseValidators = (code: string): Program =>
	parseCode("validators.js", code, {}).program

const exportedFunctionsOf = (
	program: Program
): Map<string, Node | undefined> => {
	const declared = new Map<string, Node>()
	const result = new Map<string, Node | undefined>()
	for (const statement of program.body) {
		if (statement.type === "FunctionDeclaration" && statement.id)
			declared.set(statement.id.name, statement)
		else if (statement.type === "VariableDeclaration") {
			for (const { id, init } of statement.declarations) {
				if (id.type === "Identifier" && init)
					declared.set(id.name, unwrapParentheses(init))
			}
		} else if (statement.type === "ExportNamedDeclaration") {
			for (const specifier of statement.specifiers) {
				result.set(
					exportNameOf(specifier.exported),
					specifier.local.type === "Identifier" ?
						declared.get(specifier.local.name)
					:	undefined
				)
			}
		}
	}
	return result
}

const unwrapParentheses = (node: Node): Node =>
	node.type === "ParenthesizedExpression" ?
		unwrapParentheses(node.expression)
	:	node

const isClassMember = (fn: Node): boolean =>
	fn.parent?.type === "MethodDefinition" ||
	fn.parent?.type === "PropertyDefinition"

type KeyReads = { keys: Set<string>; any: boolean }

// what code reads off a `this` no class binds, e.g. an object literal's method
// or a function called with a receiver, plus whether a builtin prototype is patched
export type ThisReads = {
	// by a function that may be bound to any object, as one reaching code the
	// build can't see
	escaped: KeyReads
	// by the functions only an object literal can bind: its own methods and
	// getters, and the functions it holds by reference
	byLiteral: ReadonlyMap<Node, KeyReads>
	// whether code the program reaches writes to Array.prototype or Object.prototype
	patchesBuiltins: boolean
}

const keyReadsIn = (reads: ThisReads, literal: Node): KeyReads[] => {
	const own = reads.byLiteral.get(literal)
	return own ? [reads.escaped, own] : [reads.escaped]
}

// whether a read of the object literal holding a validator at key may be made
// through `this`, which no reference to the object shows: by a function that
// can be bound to it, as one in its own literal, or one it holds
export const mayReadThrough = (
	key: string,
	literal: Node,
	reads: ThisReads
): boolean =>
	keyReadsIn(reads, literal).some(read => read.any || read.keys.has(key))

const builtinPrototypes = new Set(["Array.prototype", "Object.prototype"])

export const globalNameOf = (
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

// e.g. `Array.prototype.first = fn` or `Object.defineProperty(Array.prototype, …)`,
// rather than `Array.prototype.slice.call(list)`
const isBuiltinPrototypePatch = (node: Node, module: SourceModule): boolean => {
	if (
		node.type !== "MemberExpression" ||
		!builtinPrototypes.has(globalNameOf(node, module) ?? "")
	)
		return false
	const [operand, parent] = operatorOf(node)
	return (
		parent?.type !== "MemberExpression" ||
		parent.object !== operand ||
		isWriteTarget(parent)
	)
}

export const thisReadsOf = (modules: Iterable<SourceModule>): ThisReads => {
	const reads: ThisReads = {
		escaped: { keys: new Set(), any: false },
		byLiteral: new Map(),
		patchesBuiltins: false
	}
	for (const module of modules) {
		walk(module.program, node => {
			if (!reads.patchesBuiltins && isBuiltinPrototypePatch(node, module))
				reads.patchesBuiltins = true
			if (node.type !== "ThisExpression") return true
			const fn = enclosingThisFunctionOf(node)
			if (!fn || isClassMember(fn)) return true
			const read = namesReadOf(node, module)
			if (read !== "any" && !read.size) return true
			const bound = boundLiteralsOf(fn, module)
			const targets =
				bound === "escapes" ?
					[reads.escaped]
				:	bound.map(literal => {
						let own = reads.byLiteral.get(literal)
						if (!own) {
							own = { keys: new Set(), any: false }
							;(reads.byLiteral as Map<Node, KeyReads>).set(literal, own)
						}
						return own
					})
			for (const target of targets) {
				if (read === "any") target.any = true
				else for (const key of read) target.keys.add(key)
			}
			return true
		})
	}
	return reads
}

// the function a this is read in, where it has one a class doesn't bind
const enclosingThisFunctionOf = (node: Node): Node | undefined => {
	for (let at: Node | null | undefined = node.parent; at; at = at.parent) {
		if (at.type === "FunctionExpression" || at.type === "FunctionDeclaration")
			return at
		// a bare `this` outside any function is the module's
		if (at.type === "PropertyDefinition" || at.type === "StaticBlock") return
	}
}

const forwardingMethods = new Set(["apply", "call", "bind"])

const emptyNames: ReadonlySet<string> = new Set()

// the names read off what a node evaluates to, or "any" where it's read other
// than at a name, like `read(this)` or `this[k]`, or empty where it's passed
// as the receiver of a function whose own body reads it
const namesReadOf = (
	node: Node,
	module: SourceModule,
	seen = new Set<Binding>()
): ReadonlySet<string> | "any" => {
	const [operand, parent] = operatorOf(node)
	// e.g. `fn.apply(this, args)` in a debounce, where fn reads what it names
	// off its receiver at its own `this`
	if (
		parent?.type === "CallExpression" &&
		parent.arguments[0] === operand &&
		parent.callee.type === "MemberExpression" &&
		forwardingMethods.has(String(memberNameOf(parent.callee))) &&
		isForwardingCallee(parent.callee.object, module)
	)
		return emptyNames
	if (parent?.type === "MemberExpression" && parent.object === operand) {
		const name = memberNameOf(parent)
		return typeof name === "string" ? new Set([name]) : "any"
	}
	// e.g. `const self = this` or `const { schema } = this`, read at its references
	if (parent?.type === "VariableDeclarator" && parent.init === operand) {
		if (parent.id.type === "ObjectPattern") {
			const names = new Set<string>()
			for (const property of parent.id.properties) {
				const name =
					property.type === "Property" ? propertyKeyOf(property) : undefined
				if (name === undefined) return "any"
				names.add(name)
			}
			return names
		}
		const binding =
			parent.id.type === "Identifier" ?
				module.scopes.bindingsById.get(parent.id)
			:	undefined
		if (!binding || seen.has(binding)) return "any"
		seen.add(binding)
		const names = new Set<string>()
		for (const reference of binding.references) {
			if (reference.isWrite) continue
			const read = namesReadOf(reference.id, module, seen)
			if (read === "any") return "any"
			for (const name of read) names.add(name)
		}
		return names
	}
	return "any"
}

// a function whose own `this` reads thisReadsOf indexes, as a callback param,
// local function or import — not a builtin prototype method like `[].slice`
const isForwardingCallee = (
	node: Node,
	module: SourceModule,
	seen = new Set<Binding>()
): boolean => {
	const target = unwrapExpression(node)
	if (target.type !== "Identifier") return false
	const binding = module.scopes.byId.get(target)?.binding
	if (!binding || seen.has(binding)) return false
	seen.add(binding)
	if (
		binding.kind === "param" ||
		binding.kind === "function" ||
		binding.kind === "import"
	)
		return true
	if (
		binding.declaration.type === "VariableDeclarator" &&
		binding.declaration.id.type === "Identifier" &&
		binding.declaration.init
	) {
		const init = unwrapExpression(binding.declaration.init)
		return (
			init.type === "FunctionExpression" ||
			init.type === "ArrowFunctionExpression" ||
			(init.type === "Identifier" && isForwardingCallee(init, module, seen))
		)
	}
	return false
}

// the object literals a function may be bound to as their member, "escapes"
// where it may be bound to any other object
const boundLiteralsOf = (
	fn: Node,
	module: SourceModule
): readonly Node[] | "escapes" => {
	// a named function expression can pass or return itself through its own name
	if (
		fn.type === "FunctionExpression" &&
		fn.id &&
		module.scopes.bindingsById.get(fn.id)?.references.length
	)
		return "escapes"
	const parent = fn.parent
	if (parent?.type === "Property" && parent.value === fn) {
		const literal = parent.parent
		return (
				literal?.type === "ObjectExpression" &&
					isContained(literal, module, parent)
			) ?
				[literal]
			:	"escapes"
	}
	const binding =
		fn.type === "FunctionDeclaration" ?
			fn.id && module.scopes.bindingsById.get(fn.id)
		: (
			parent?.type === "VariableDeclarator" &&
			parent.init === fn &&
			parent.id.type === "Identifier"
		) ?
			module.scopes.bindingsById.get(parent.id)
		:	undefined
	if (!binding || binding.exportNames.length) return "escapes"
	const literals: Node[] = []
	for (const reference of binding.references) {
		if (reference.isWrite) continue
		const [operand, use] = operatorOf(reference.id)
		// held by an object literal, shorthand or by reference
		if (use?.type === "Property" && use.value === operand) {
			const literal = use.parent
			if (
				literal?.type !== "ObjectExpression" ||
				!isContained(literal, module, use)
			)
				return "escapes"
			literals.push(literal)
			continue
		}
		// called as a function, which binds no receiver
		if (use?.type === "CallExpression" && use.callee === operand) continue
		return "escapes"
	}
	return literals
}

type PropertyNode = Extract<Node, { type: "Property" }>

// whether `property`'s function on `literal` cannot be detached and bound to
// another object: neither through references to `literal`'s binding nor through
// `this` inside `literal`'s own methods/getters or external methods called on it
const isContained = (
	literal: Extract<Node, { type: "ObjectExpression" }>,
	module: SourceModule,
	property: PropertyNode
): boolean => {
	const fnKey = propertyKeyOf(property)
	if (fnKey === undefined) return false
	const isMethod = property.kind === "init"
	const [operand, declarator] = operatorOf(literal)
	if (
		declarator?.type !== "VariableDeclarator" ||
		declarator.init !== operand ||
		declarator.id.type !== "Identifier"
	)
		return false
	const binding = module.scopes.bindingsById.get(declarator.id)
	if (!binding || binding.exportNames.length) return false
	const ownKeys = new Set<string>()
	// keys whose value is not inline, so calling `literal.<key>()` runs external
	// code with `this === literal` that could detach `this.<fnKey>`
	const externalKeys = new Set<string>()
	for (const prop of literal.properties) {
		if (prop.type !== "Property") return false
		const key = propertyKeyOf(prop)
		if (key === undefined) return false
		ownKeys.add(key)
		if (prop !== property && prop.kind === "init") {
			const value = unwrapExpression(prop.value)
			if (
				value.type !== "FunctionExpression" &&
				value.type !== "ArrowFunctionExpression" &&
				value.type !== "Literal" &&
				value.type !== "TemplateLiteral" &&
				value.type !== "ObjectExpression" &&
				value.type !== "ArrayExpression"
			)
				externalKeys.add(key)
		}
	}
	const refsContained = binding.references.every(reference => {
		if (reference.isWrite) return false
		const [read, use] = operatorOf(reference.id)
		if (
			use?.type !== "MemberExpression" ||
			use.object !== read ||
			isWriteTarget(use)
		)
			return false
		const name = memberNameOf(use)
		if (typeof name !== "string") return false
		// e.g. `other.valueOf()`, `other.__lookupGetter__("x")`, `other.__proto__`
		if (!ownKeys.has(name) && name in Object.prototype) return false
		const [member, after] = operatorOf(use)
		const isDirectCall =
			after?.type === "CallExpression" && after.callee === member
		// `other.run` must only be called directly, never read (e.g. `.valueOf()`, `.bind()`)
		if (isMethod && name === fnKey) return isDirectCall
		// calling an external property on `other` passes `this === other` to unseen code
		if (externalKeys.has(name) && isDirectCall) return false
		return true
	})
	if (!refsContained) return false
	let leaksThis = false
	walk(literal, node => {
		if (leaksThis) return false
		if (node.type !== "ThisExpression") return true
		const owner = enclosingThisFunctionOf(node)
		if (
			owner &&
			owner.parent?.type === "Property" &&
			owner.parent.value === owner &&
			owner.parent.parent === literal &&
			!isContainedThis(node, fnKey, isMethod, ownKeys, externalKeys, module)
		)
			leaksThis = true
		return true
	})
	return !leaksThis
}

// whether a `this` read inside a literal's own method or getter can neither
// leak the literal itself nor detach its property at `fnKey`
const isContainedThis = (
	node: Node,
	fnKey: string,
	isMethod: boolean,
	ownKeys: ReadonlySet<string>,
	externalKeys: ReadonlySet<string>,
	module: SourceModule,
	seen = new Set<Binding>()
): boolean => {
	const [operand, parent] = operatorOf(node)
	if (parent?.type === "MemberExpression" && parent.object === operand) {
		if (isWriteTarget(parent)) return false
		const name = memberNameOf(parent)
		if (typeof name === "string") {
			if (!ownKeys.has(name) && name in Object.prototype) return false
			const [member, after] = operatorOf(parent)
			const isDirectCall =
				after?.type === "CallExpression" && after.callee === member
			if (isMethod && name === fnKey) return isDirectCall
			if (externalKeys.has(name) && isDirectCall) return false
			return true
		}
		// computed read `this[k]` can return `this[fnKey]` unless only converted/logged
		return isNonEscapingRead(parent, module)
	}
	if (parent?.type === "VariableDeclarator" && parent.init === operand) {
		if (parent.id.type === "ObjectPattern") {
			return parent.id.properties.every(property => {
				const key =
					property.type === "Property" ? propertyKeyOf(property) : undefined
				return (
					key !== undefined &&
					(!isMethod || key !== fnKey) &&
					(ownKeys.has(key) || !(key in Object.prototype))
				)
			})
		}
		const binding =
			parent.id.type === "Identifier" ?
				module.scopes.bindingsById.get(parent.id)
			:	undefined
		if (!binding || seen.has(binding)) return false
		seen.add(binding)
		return binding.references.every(
			reference =>
				reference.isWrite ||
				isContainedThis(
					reference.id,
					fnKey,
					isMethod,
					ownKeys,
					externalKeys,
					module,
					seen
				)
		)
	}
	return false
}

// whether a computed `this[k]` value cannot escape as a callable function
const isNonEscapingRead = (node: Node, module: SourceModule): boolean => {
	const [operand, parent] = operatorOf(node)
	if (!parent) return false
	if (parent.type === "ExpressionStatement") return true
	if (parent.type === "UnaryExpression") return true
	if (parent.type === "BinaryExpression") return parent.operator !== "in"
	if (parent.type === "TemplateLiteral")
		return parent.parent?.type !== "TaggedTemplateExpression"
	if (parent.type === "CallExpression" && parent.callee !== operand) {
		const name = globalNameOf(parent.callee, module)
		return (
			name === "String" ||
			name === "Boolean" ||
			name === "Number" ||
			name === "console.log" ||
			name === "console.warn" ||
			name === "console.error"
		)
	}
	return false
}
