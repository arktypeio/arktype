import { receiverPrefix } from "arktype/internal/standalone.ts"
import type {
	AccessorProperty,
	MethodDefinition,
	Node,
	Program,
	PropertyDefinition,
	Span
} from "oxc-parser"
import { isFunctionNode, memberNameOf } from "./graph.ts"
import type { SiteFactory } from "./fold.ts"
import { parseCode, type SourceModule } from "./module.ts"
import { runtimeParamsOf } from "./proofs.ts"
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

export type ReachedModules = {
	modules: readonly SourceModule[]
	resolve: (
		specifier: string,
		importer: SourceModule
	) => SourceModule | undefined
}

export type ThisReadsOptions = {
	entries?: ReadonlySet<string>
	exposed?: ReadonlySet<string>
	resolve?: (
		specifier: string,
		importer: SourceModule
	) => SourceModule | undefined
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
	reached?: () => ReachedModules
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
		if (this.reads) return this.reads
		const reached = this.program.reached?.()
		const modules =
			reached?.modules ??
			[...this.program.modules.values()].map(runtime => runtime.module)
		const resolve =
			reached?.resolve ??
			((specifier: string, importer: SourceModule) => {
				const id = this.program.resolve(specifier, importer.id)
				return id === undefined ? undefined : (
						this.program.modules.get(id)?.module
					)
			})
		return (this.reads = thisReadsOf(modules, {
			entries: this.program.entries,
			exposed: this.program.exposed,
			resolve
		}))
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
					mayReadThrough(
						key,
						parent.parent,
						module,
						this.thisReads,
						!path.length
					))
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
				(memberParent?.type === "CallExpression" &&
					memberParent.callee === member) ||
				(memberParent?.type === "TaggedTemplateExpression" &&
					memberParent.tag === member)
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

// whether a read of the object literal holding a validator at key may be made
// through `this`, which no reference to the object shows: by a function that
// can be bound to it, as one in its own literal, or one it holds
export const mayReadThrough = (
	key: string,
	literal: Node,
	module: SourceModule,
	reads: ThisReads,
	isDirectValidator = false
): boolean => {
	const own = reads.byLiteral.get(literal)
	if (own && (own.any || own.keys.has(key))) return true
	if (!reads.escaped.any && !reads.escaped.keys.has(key)) return false
	if (
		!reads.patchesBuiltins &&
		literal.type === "ObjectExpression" &&
		receivesNoEscapedThis(literal, module, isDirectValidator ? key : undefined)
	)
		return false
	return true
}

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

const builtinPrototypeCtors = new Set(["Array", "Function", "Object"])
const globalHostNames = new Set(["globalThis", "window", "self", "global"])
const prototypeMutators = new Set([
	"Object.defineProperty",
	"Object.defineProperties",
	"Reflect.defineProperty",
	"Reflect.set",
	"Object.assign",
	"Object.setPrototypeOf",
	"Reflect.setPrototypeOf"
])

const isUnboundGlobal = (
	node: Node,
	module: SourceModule,
	names: ReadonlySet<string>
): boolean => {
	const target = unwrapExpression(node)
	return (
		target.type === "Identifier" &&
		names.has(target.name) &&
		!module.scopes.byId.get(target)?.binding
	)
}

const isGlobalHost = (node: Node, module: SourceModule): boolean => {
	const target = unwrapExpression(node)
	if (isUnboundGlobal(target, module, globalHostNames)) return true
	if (target.type !== "MemberExpression") return false
	const name = memberNameOf(target)
	return (
		typeof name === "string" &&
		globalHostNames.has(name) &&
		isGlobalHost(target.object, module)
	)
}

// e.g. `Array`, `Object`, `globalThis.Array`, `window.Object`
const isBuiltinCtor = (node: Node, module: SourceModule): boolean => {
	const target = unwrapExpression(node)
	if (isUnboundGlobal(target, module, builtinPrototypeCtors)) return true
	if (target.type !== "MemberExpression") return false
	const name = memberNameOf(target)
	return (
		typeof name === "string" &&
		builtinPrototypeCtors.has(name) &&
		isGlobalHost(target.object, module)
	)
}

// e.g. `Object.getPrototypeOf`, `Reflect.getPrototypeOf`, `globalThis.Object.getPrototypeOf`
const isGetPrototypeOfCallee = (node: Node, module: SourceModule): boolean => {
	const target = unwrapExpression(node)
	if (
		target.type !== "MemberExpression" ||
		memberNameOf(target) !== "getPrototypeOf"
	)
		return false
	const owner = unwrapExpression(target.object)
	if (
		owner.type === "Identifier" &&
		(owner.name === "Object" || owner.name === "Reflect") &&
		!module.scopes.byId.get(owner)?.binding
	)
		return true
	if (owner.type !== "MemberExpression") return false
	const ownerName = memberNameOf(owner)
	return (
		(ownerName === "Object" || ownerName === "Reflect") &&
		isGlobalHost(owner.object, module)
	)
}

// `==`, `===`, `!=` or `!==`, which compare a reference without leaking it
const isEqualityOperator = (operator: string): boolean =>
	/^[!=]==?$/.test(operator)

// a read of a prototype that neither mutates nor leaks it, e.g.
// `Array.prototype.slice.call(list)` or `proto === Object.prototype`
const isSafePrototypeRead = (
	operand: Node,
	parent: Node | undefined
): boolean =>
	(parent?.type === "MemberExpression" &&
		parent.object === operand &&
		!isWriteTarget(parent)) ||
	(parent?.type === "BinaryExpression" && isEqualityOperator(parent.operator))

const isPrototypeMutatorCall = (
	operand: Node,
	parent: Node | undefined,
	module: SourceModule
): boolean => {
	if (parent?.type !== "CallExpression" || parent.arguments[0] !== operand)
		return false
	const callee = unwrapExpression(parent.callee)
	const name = globalNameOf(callee, module)
	if (name && prototypeMutators.has(name)) return true
	if (callee.type !== "MemberExpression") return false
	const method = memberNameOf(callee)
	const owner = unwrapExpression(callee.object)
	if (
		typeof method !== "string" ||
		owner.type !== "MemberExpression" ||
		!isGlobalHost(owner.object, module)
	)
		return false
	const ownerName = memberNameOf(owner)
	return (
		typeof ownerName === "string" &&
		prototypeMutators.has(`${ownerName}.${method}`)
	)
}

const isArrayOrObjectLiteral = (node: Node | undefined): boolean => {
	if (!node) return false
	const target = unwrapExpression(node)
	return target.type === "ArrayExpression" || target.type === "ObjectExpression"
}

const destructuresPrototype = (pattern: Node): boolean =>
	pattern.type === "ObjectPattern" &&
	pattern.properties.some(
		prop =>
			prop.type === "RestElement" ||
			propertyKeyOf(prop) === "prototype" ||
			propertyKeyOf(prop) === undefined
	)

// e.g. `Array.prototype.first = fn`, `globalThis.Array.prototype.first = fn`,
// `Object.getPrototypeOf([]).first = fn`, `[].__proto__.first = fn`, or
// `const { prototype } = Array` — rather than `Array.prototype.slice.call(list)`
const isBuiltinPrototypePatch = (node: Node, module: SourceModule): boolean => {
	if (
		node.type === "MemberExpression" &&
		memberNameOf(node) === "prototype" &&
		isBuiltinCtor(node.object, module)
	) {
		const [operand, parent] = operatorOf(node)
		return !isSafePrototypeRead(operand, parent)
	}
	if (isBuiltinCtor(node, module)) {
		const [operand, parent] = operatorOf(node)
		if (
			parent?.type === "VariableDeclarator" &&
			parent.init === operand &&
			destructuresPrototype(parent.id)
		)
			return true
		if (
			parent?.type === "AssignmentExpression" &&
			parent.right === operand &&
			destructuresPrototype(parent.left)
		)
			return true
		if (
			parent?.type === "CallExpression" &&
			parent.arguments[0] === operand &&
			globalNameOf(unwrapExpression(parent.callee), module)?.endsWith(
				"getOwnPropertyDescriptor"
			)
		)
			return true
	}
	if (
		node.type === "CallExpression" &&
		isGetPrototypeOfCallee(node.callee, module)
	) {
		const [operand, parent] = operatorOf(node)
		if (
			(parent?.type === "MemberExpression" &&
				parent.object === operand &&
				isWriteTarget(parent)) ||
			isPrototypeMutatorCall(operand, parent, module)
		)
			return true
		if (isArrayOrObjectLiteral(node.arguments[0]))
			return !isSafePrototypeRead(operand, parent)
	}
	if (
		node.type === "MemberExpression" &&
		memberNameOf(node) === "__proto__" &&
		!isWriteTarget(node)
	) {
		const [operand, parent] = operatorOf(node)
		if (
			(parent?.type === "MemberExpression" &&
				parent.object === operand &&
				isWriteTarget(parent)) ||
			isPrototypeMutatorCall(operand, parent, module)
		)
			return true
		if (isArrayOrObjectLiteral(node.object))
			return !isSafePrototypeRead(operand, parent)
	}
	return false
}

type ThisImportEdge =
	| { kind: "named"; name: string; binding: Binding; module: SourceModule }
	| { kind: "namespace"; binding: Binding; module: SourceModule }
	| { kind: "reexport"; name: string; as: string; module: SourceModule }
	| { kind: "star"; module: SourceModule }
	| { kind: "whole"; module: SourceModule }

type ThisReadsContext = {
	modules: readonly SourceModule[]
	entries: ReadonlySet<string>
	exposed: ReadonlySet<string>
	resolve: (
		specifier: string,
		importer: SourceModule
	) => SourceModule | undefined
	importersById: Map<string, ThisImportEdge[]>
	hasDynamicImport: boolean
	uncalledKeys: Set<string>
	hasProtoInheritance: boolean
	hasDescriptorRead: boolean
	hasEscapedPrototype: boolean
	patchesBuiltins: boolean
	skippedCache: Map<Node, boolean>
}

type CallSite = {
	call: Extract<Node, { type: "CallExpression" }>
	module: SourceModule
}

type ClassMemberNode = MethodDefinition | PropertyDefinition | AccessorProperty

type Es5ProtoMethod = { ctorBinding: Binding; methodKey: string }

const emptyStringSet: ReadonlySet<string> = new Set()

const constantKeyOf = (
	node: Node,
	module: SourceModule,
	seen = new Set<Binding>()
): string | undefined => {
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
	if (!binding || binding.kind !== "const" || seen.has(binding)) return
	seen.add(binding)
	const { declaration } = binding
	return (
			declaration.type === "VariableDeclarator" &&
				declaration.id === binding.id &&
				declaration.init
		) ?
			constantKeyOf(declaration.init, module, seen)
		:	undefined
}

const staticMemberKeyOf = (
	member: Extract<Node, { type: "MemberExpression" }>,
	module: SourceModule
): string | undefined => {
	// checked before memberNameOf, which names `this.#m` "m", so the key matches
	// classMemberKeyOf's "#m"
	if (!member.computed && member.property.type === "PrivateIdentifier")
		return `#${member.property.name}`
	const name = memberNameOf(member)
	if (typeof name === "string" || typeof name === "number") return String(name)
	return member.computed ? constantKeyOf(member.property, module) : undefined
}

const classMemberKeyOf = (
	member: ClassMemberNode,
	module: SourceModule
): string | undefined => {
	if (!member.computed && member.key.type === "PrivateIdentifier")
		return `#${member.key.name}`
	return (
		propertyKeyOf(member) ??
		(member.computed ? constantKeyOf(member.key, module) : undefined)
	)
}

const isDirectCallMember = (member: Node): boolean => {
	const [operand, after] = operatorOf(member)
	return (
		(after?.type === "CallExpression" && after.callee === operand) ||
		(after?.type === "TaggedTemplateExpression" && after.tag === operand)
	)
}

const isDiscardedAssignment = (node: Node): boolean => {
	const [operand, parent] = operatorOf(node)
	if (!parent) return false
	if (parent.type === "ExpressionStatement") return true
	if (parent.type === "SequenceExpression") {
		return (
			parent.expressions[parent.expressions.length - 1] !== operand ||
			isDiscardedAssignment(parent)
		)
	}
	return false
}

const isDiscardedProtoMethodWrite = (
	member: Extract<Node, { type: "MemberExpression" }>
): boolean => {
	const [operand, parent] = operatorOf(member)
	return (
		parent?.type === "AssignmentExpression" &&
		parent.operator === "=" &&
		parent.left === operand &&
		isDiscardedAssignment(parent)
	)
}

const isSubProtoCreate = (
	operand: Node,
	parent: Node | undefined,
	module: SourceModule
): boolean => {
	if (
		parent?.type !== "CallExpression" ||
		parent.arguments[0] !== operand ||
		parent.arguments.length !== 1 ||
		globalNameOf(unwrapExpression(parent.callee), module) !== "Object.create"
	)
		return false
	const [callOp, assign] = operatorOf(parent)
	if (
		assign?.type !== "AssignmentExpression" ||
		assign.operator !== "=" ||
		assign.right !== callOp ||
		!isDiscardedAssignment(assign)
	)
		return false
	const left = unwrapExpression(assign.left)
	return left.type === "MemberExpression" && memberNameOf(left) === "prototype"
}

const isNonNullProtoProperty = (
	prop: Extract<Node, { type: "Property" }>
): boolean => {
	if (
		prop.computed ||
		prop.kind !== "init" ||
		propertyKeyOf(prop) !== "__proto__"
	)
		return false
	const proto = unwrapExpression(prop.value)
	return proto.type !== "Literal" || proto.value !== null
}

const buildThisReadsContext = (
	modules: readonly SourceModule[],
	options?: ThisReadsOptions
): ThisReadsContext => {
	const resolve = options?.resolve ?? (() => undefined)
	const importersById = new Map<string, ThisImportEdge[]>()
	const addEdge = (
		specifier: string,
		importer: SourceModule,
		edge: ThisImportEdge
	) => {
		const target = resolve(specifier, importer)
		if (!target) return
		const edges = importersById.get(target.id)
		if (edges) edges.push(edge)
		else importersById.set(target.id, [edge])
	}
	let hasDynamicImport = false
	const uncalledKeys = new Set<string>()
	let hasProtoInheritance = false
	let hasDescriptorRead = false
	let hasEscapedPrototype = false
	let patchesBuiltins = false

	for (const module of modules) {
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
					addEdge(
						statement.source.value,
						module,
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
					if (specifier.exportKind === "type") continue
					addEdge(statement.source.value, module, {
						kind: "reexport",
						name: exportNameOf(specifier.local),
						as: exportNameOf(specifier.exported),
						module
					})
				}
			} else if (statement.type === "ExportAllDeclaration") {
				if (statement.exportKind === "type") continue
				addEdge(
					statement.source.value,
					module,
					statement.exported ?
						{ kind: "whole", module }
					:	{ kind: "star", module }
				)
			} else if (statement.type === "TSImportEqualsDeclaration") {
				if (statement.moduleReference.type === "TSExternalModuleReference") {
					addEdge(statement.moduleReference.expression.value, module, {
						kind: "whole",
						module
					})
				}
			}
		}

		for (const { id, binding } of module.scopes.root.unresolved) {
			if (binding || id.name !== "require") continue
			const [operand, parent] = operatorOf(id)
			const specifier =
				parent?.type === "CallExpression" && parent.callee === operand ?
					literalOf(parent.arguments[0])
				:	undefined
			if (specifier !== undefined)
				addEdge(specifier, module, { kind: "whole", module })
			else hasDynamicImport = true
		}

		walk(module.program, node => {
			if (!patchesBuiltins && isBuiltinPrototypePatch(node, module))
				patchesBuiltins = true
			if (node.type === "ImportExpression") {
				const specifier = literalOf(node.source)
				if (specifier !== undefined)
					addEdge(specifier, module, { kind: "whole", module })
				else hasDynamicImport = true
			} else if (node.type === "MemberExpression" && node.parent) {
				if (isWriteTarget(node)) {
					if (staticMemberKeyOf(node, module) === "__proto__")
						hasProtoInheritance = true
				} else {
					const key = staticMemberKeyOf(node, module)
					// a non-constant read like `x[k]` may detach any method, whatever
					// reaches `x` (`pick(new C(), k)`, a mixin copy over
					// getOwnPropertyNames), so it counts as an uncalled read of every
					// key. Detached methods still go through receiver isolation.
					if (key === undefined && node.computed && !isDirectCallMember(node))
						hasDescriptorRead = true
					else if (key !== undefined && !isDirectCallMember(node)) {
						uncalledKeys.add(key)
						if (
							key === "prototype" &&
							!isUnboundIdentifier(node.object, module)
						) {
							const [protoOp, protoUse] = operatorOf(node)
							const isSafeProtoUse =
								(protoUse?.type === "MemberExpression" &&
									protoUse.object === protoOp &&
									isDiscardedProtoMethodWrite(protoUse)) ||
								isSubProtoCreate(protoOp, protoUse, module) ||
								(protoUse?.type === "BinaryExpression" &&
									isEqualityOperator(protoUse.operator))
							if (!isSafeProtoUse) hasEscapedPrototype = true
						}
					}
				}
			} else if (node.type === "ObjectPattern") {
				for (const property of node.properties) {
					if (property.type === "Property") {
						const key =
							propertyKeyOf(property) ??
							(property.computed ?
								constantKeyOf(property.key, module)
							:	undefined)
						if (key !== undefined) uncalledKeys.add(key)
					}
				}
			} else if (node.type === "ObjectExpression") {
				for (const property of node.properties) {
					if (property.type === "Property" && isNonNullProtoProperty(property))
						hasProtoInheritance = true
				}
			} else if (node.type === "CallExpression") {
				const callee = unwrapExpression(node.callee)
				const name = globalNameOf(callee, module)
				if (
					name === "Object.setPrototypeOf" ||
					name === "Reflect.setPrototypeOf"
				)
					hasProtoInheritance = true
				else if (
					name === "Object.getOwnPropertyDescriptor" ||
					name === "Object.getOwnPropertyDescriptors" ||
					name === "Reflect.getOwnPropertyDescriptor"
				)
					hasDescriptorRead = true
				else if (name === "Reflect.get") {
					const k =
						node.arguments[1] && constantKeyOf(node.arguments[1], module)
					if (k !== undefined) uncalledKeys.add(k)
					else hasDescriptorRead = true
				} else if (callee.type === "MemberExpression") {
					const method = staticMemberKeyOf(callee, module)
					if (method === "__lookupGetter__" || method === "__lookupSetter__")
						hasDescriptorRead = true
				}
			}
			return true
		})
	}

	return {
		modules,
		entries: options?.entries ?? emptyStringSet,
		exposed: options?.exposed ?? emptyStringSet,
		resolve,
		importersById,
		hasDynamicImport,
		uncalledKeys,
		hasProtoInheritance,
		hasDescriptorRead,
		hasEscapedPrototype,
		patchesBuiltins,
		skippedCache: new Map()
	}
}

const isUnboundIdentifier = (node: Node, module: SourceModule): boolean => {
	const target = unwrapExpression(node)
	return (
		target.type === "Identifier" && !module.scopes.byId.get(target)?.binding
	)
}

export const thisReadsOf = (
	modules: Iterable<SourceModule>,
	options?: ThisReadsOptions
): ThisReads => {
	const moduleList = [...modules]
	const ctx = buildThisReadsContext(moduleList, options)
	const reads: ThisReads = {
		escaped: { keys: new Set(), any: false },
		byLiteral: new Map(),
		patchesBuiltins: ctx.patchesBuiltins
	}
	const addLiteralTarget = (literal: Node, targets: KeyReads[]) => {
		let own = reads.byLiteral.get(literal)
		if (!own) {
			own = { keys: new Set(), any: false }
			;(reads.byLiteral as Map<Node, KeyReads>).set(literal, own)
		}
		targets.push(own)
	}
	for (const module of moduleList) {
		walk(module.program, node => {
			if (node.type !== "ThisExpression") return true
			const fn = enclosingThisFunctionOf(node)
			if (!fn || isSkippedFunction(fn, module, ctx)) return true
			const read = namesReadOf(node, module, ctx)
			if (read !== "any" && !read.size) return true
			const bound = boundLiteralsOf(fn, module)
			const ownLiteral =
				(
					fn.parent?.type === "Property" &&
					fn.parent.value === fn &&
					fn.parent.parent?.type === "ObjectExpression"
				) ?
					fn.parent.parent
				:	undefined
			const targets: KeyReads[] = []
			if (bound === "escapes") {
				targets.push(reads.escaped)
				// keep own literal's reads indexed even when its method escapes, so
				// isolated-receiver checks on that literal still see its own methods
				if (ownLiteral) addLiteralTarget(ownLiteral, targets)
			} else for (const literal of bound) addLiteralTarget(literal, targets)

			for (const target of targets) {
				if (read === "any") target.any = true
				else for (const key of read) target.keys.add(key)
			}
			return true
		})
	}
	return reads
}

const classMemberParentOf = (fn: Node): ClassMemberNode | undefined => {
	const [operand, parent] = operatorOf(fn)
	return (
			(parent?.type === "MethodDefinition" ||
				parent?.type === "PropertyDefinition" ||
				parent?.type === "AccessorProperty") &&
				parent.value === operand
		) ?
			parent
		:	undefined
}

// e.g. `Component.prototype.forceUpdate = function () { ... }` in compiled dependencies
const es5ProtoMethodOf = (
	fn: Node,
	module: SourceModule
): Es5ProtoMethod | undefined => {
	if (fn.type !== "FunctionExpression") return
	const [rhs, assign] = operatorOf(fn)
	if (
		assign?.type !== "AssignmentExpression" ||
		assign.operator !== "=" ||
		assign.right !== rhs ||
		!isDiscardedAssignment(assign)
	)
		return
	const left = unwrapExpression(assign.left)
	if (left.type !== "MemberExpression") return
	const methodKey = staticMemberKeyOf(left, module)
	if (methodKey === undefined) return
	const proto = unwrapExpression(left.object)
	if (proto.type !== "MemberExpression" || memberNameOf(proto) !== "prototype")
		return
	const ctorNode = unwrapExpression(proto.object)
	if (ctorNode.type !== "Identifier") return
	const ctorBinding = module.scopes.byId.get(ctorNode)?.binding
	if (!ctorBinding || ctorBinding.writes.length > 0) return
	const isCtorFn =
		ctorBinding.kind === "function" ||
		(ctorBinding.declaration.type === "VariableDeclarator" &&
			ctorBinding.declaration.id === ctorBinding.id &&
			!!ctorBinding.declaration.init &&
			unwrapExpression(ctorBinding.declaration.init).type ===
				"FunctionExpression")
	return isCtorFn ? { ctorBinding, methodKey } : undefined
}

// whether `fn`'s `this` reads cannot reach any object literal and are skipped by
// `thisReadsOf`: class constructors, non-detached class/ES5-prototype methods,
// and provably unreferenced top-level functions in non-entry modules
const isSkippedFunction = (
	fn: Node,
	module: SourceModule,
	ctx: ThisReadsContext
): boolean => {
	const cached = ctx.skippedCache.get(fn)
	if (cached !== undefined) return cached
	// provisionally false while computing to prevent any cycle from skipping unsafely
	ctx.skippedCache.set(fn, false)
	const result = computeSkippedFunction(fn, module, ctx)
	ctx.skippedCache.set(fn, result)
	return result
}

const computeSkippedFunction = (
	fn: Node,
	module: SourceModule,
	ctx: ThisReadsContext
): boolean => {
	const classMember = classMemberParentOf(fn)
	if (classMember) {
		// class-field function expressions are own enumerable properties and can be
		// detached by spread, Object.assign, or property reads — always index them
		if (classMember.type !== "MethodDefinition") return false
		// ES6 class constructors throw without `new` and cannot bind an object literal
		if (classMember.kind === "constructor") return true
		const key = classMemberKeyOf(classMember, module)
		if (key === undefined) return false
		if (ctx.hasProtoInheritance || ctx.hasDescriptorRead) return false
		if (classMember.kind === "method" && ctx.uncalledKeys.has(key)) return false
		const cls = classMember.parent?.parent
		if (
			!cls ||
			(cls.type !== "ClassDeclaration" && cls.type !== "ClassExpression")
		)
			return false
		return !classExposesMembers(cls, module, ctx)
	}
	const es5Method = es5ProtoMethodOf(fn, module)
	if (es5Method) {
		if (ctx.hasProtoInheritance || ctx.hasDescriptorRead) return false
		if (ctx.uncalledKeys.has(es5Method.methodKey)) return false
		return !ctorExposesPrototype(es5Method.ctorBinding, module, ctx)
	}
	return isDeadTopLevelFunction(fn, module, ctx)
}

const instanceExposesComputed = (
	newExpr: Node,
	module: SourceModule
): boolean => {
	const [op, parent] = operatorOf(newExpr)
	if (
		parent?.type === "MemberExpression" &&
		parent.object === op &&
		!isWriteTarget(parent) &&
		staticMemberKeyOf(parent, module) === undefined &&
		!isDirectCallMember(parent)
	)
		return true
	if (
		parent?.type === "VariableDeclarator" &&
		parent.init === op &&
		parent.id.type === "Identifier"
	) {
		const binding = module.scopes.bindingsById.get(parent.id)
		if (!binding) return true
		for (const ref of binding.references) {
			if (ref.isWrite) continue
			const [refOp, refUse] = operatorOf(ref.id)
			if (
				refUse?.type === "MemberExpression" &&
				refUse.object === refOp &&
				!isWriteTarget(refUse) &&
				staticMemberKeyOf(refUse, module) === undefined &&
				!isDirectCallMember(refUse)
			)
				return true
		}
	}
	return false
}

const classExposesMembers = (
	cls: Extract<Node, { type: "ClassDeclaration" | "ClassExpression" }>,
	module: SourceModule,
	ctx: ThisReadsContext
): boolean => {
	const clsBinding =
		cls.type === "ClassDeclaration" ?
			cls.id && module.scopes.bindingsById.get(cls.id)
		:	(() => {
				const [op, parent] = operatorOf(cls)
				return (
						parent?.type === "VariableDeclarator" &&
							parent.init === op &&
							parent.id.type === "Identifier"
					) ?
						module.scopes.bindingsById.get(parent.id)
					:	undefined
			})()
	if (!clsBinding || clsBinding.writes.length > 0) return true
	return classBindingExposes(clsBinding, module, ctx, new Set(), new Set())
}

const classBindingExposes = (
	binding: Binding,
	module: SourceModule,
	ctx: ThisReadsContext,
	seenBindings: Set<Binding>,
	seenExports: Set<string>
): boolean => {
	if (seenBindings.has(binding)) return false
	seenBindings.add(binding)
	if (binding.writes.length > 0) return true
	for (const ref of binding.references) {
		if (ref.isWrite) return true
		const [op, use] = operatorOf(ref.id)
		if (
			use?.type === "ExportSpecifier" ||
			(use?.type === "ExportDefaultDeclaration" && use.declaration === op)
		)
			continue
		if (use?.type === "NewExpression" && use.callee === op) {
			if (instanceExposesComputed(use, module)) return true
			continue
		}
		if (
			(use?.type === "ClassDeclaration" || use?.type === "ClassExpression") &&
			use.superClass === op
		) {
			if (classExposesMembers(use, module, ctx)) return true
			continue
		}
		if (
			use?.type === "BinaryExpression" &&
			(use.operator === "instanceof" || isEqualityOperator(use.operator))
		)
			continue
		if (use?.type === "MemberExpression" && use.object === op) {
			if (isWriteTarget(use)) return true
			const name = staticMemberKeyOf(use, module)
			if (name === "prototype") return true
			if (name === undefined && !isDirectCallMember(use)) return true
			continue
		}
		if (isNonCallingFunctionRead(op, use, module)) continue
		return true
	}
	for (const exportName of binding.exportNames) {
		if (classExportExposes(module, exportName, ctx, seenBindings, seenExports))
			return true
	}
	return false
}

const classExportExposes = (
	module: SourceModule,
	exportName: string,
	ctx: ThisReadsContext,
	seenBindings: Set<Binding>,
	seenExports: Set<string>
): boolean => {
	const key = `${module.id}\0${exportName}`
	if (seenExports.has(key)) return false
	seenExports.add(key)
	if (ctx.entries.has(module.id) || ctx.exposed.has(module.id))
		return ctx.hasEscapedPrototype
	for (const edge of ctx.importersById.get(module.id) ?? []) {
		switch (edge.kind) {
			case "named":
				if (
					edge.name === exportName &&
					classBindingExposes(
						edge.binding,
						edge.module,
						ctx,
						seenBindings,
						seenExports
					)
				)
					return true
				break
			case "reexport":
				if (
					edge.name === exportName &&
					classExportExposes(
						edge.module,
						edge.as,
						ctx,
						seenBindings,
						seenExports
					)
				)
					return true
				break
			case "star":
				if (
					exportName !== "default" &&
					classExportExposes(
						edge.module,
						exportName,
						ctx,
						seenBindings,
						seenExports
					)
				)
					return true
				break
			case "namespace":
			case "whole":
				if (ctx.hasEscapedPrototype) return true
				break
		}
	}
	return false
}

const ctorExposesPrototype = (
	ctorBinding: Binding,
	module: SourceModule,
	ctx: ThisReadsContext
): boolean => {
	if (ctorBinding.exportNames.length > 0 && ctx.hasEscapedPrototype) return true
	for (const ref of ctorBinding.references) {
		if (ref.isWrite) return true
		const [op, use] = operatorOf(ref.id)
		if (
			use?.type === "MemberExpression" &&
			use.object === op &&
			memberNameOf(use) === "prototype"
		) {
			const [protoOp, protoUse] = operatorOf(use)
			if (isSubProtoCreate(protoOp, protoUse, module)) continue
			if (
				protoUse?.type === "BinaryExpression" &&
				isEqualityOperator(protoUse.operator)
			)
				continue
			if (
				protoUse?.type === "MemberExpression" &&
				protoUse.object === protoOp
			) {
				if (isDiscardedProtoMethodWrite(protoUse)) continue
				if (
					!isWriteTarget(protoUse) &&
					staticMemberKeyOf(protoUse, module) !== undefined
				)
					continue
			}
			return true
		}
		if (use?.type === "NewExpression" && use.callee === op)
			if (instanceExposesComputed(use, module)) return true
	}
	return false
}

const isDeadTopLevelFunction = (
	fn: Node,
	module: SourceModule,
	ctx: ThisReadsContext
): boolean => {
	if (
		ctx.hasDynamicImport ||
		ctx.entries.has(module.id) ||
		ctx.exposed.has(module.id) ||
		module.scopes.isCommonJs
	)
		return false
	const [op, parent] = operatorOf(fn)
	if (parent?.type === "ExportDefaultDeclaration" && parent.declaration === op)
		return !isExportUsed(module, "default", ctx)
	const binding =
		(
			fn.type === "FunctionDeclaration" &&
			fn.id &&
			(parent?.type === "Program" ||
				((parent?.type === "ExportNamedDeclaration" ||
					parent?.type === "ExportDefaultDeclaration") &&
					parent.parent?.type === "Program"))
		) ?
			module.scopes.bindingsById.get(fn.id)
		: (
			parent?.type === "VariableDeclarator" &&
			parent.init === op &&
			parent.id.type === "Identifier" &&
			parent.parent?.type === "VariableDeclaration" &&
			(parent.parent.parent?.type === "Program" ||
				(parent.parent.parent?.type === "ExportNamedDeclaration" &&
					parent.parent.parent.parent?.type === "Program"))
		) ?
			module.scopes.bindingsById.get(parent.id)
		:	undefined
	if (!binding || binding.writes.length > 0) return false
	for (const ref of binding.references) {
		const [refOp, refUse] = operatorOf(ref.id)
		if (
			refUse?.type === "ExportSpecifier" ||
			(refUse?.type === "ExportDefaultDeclaration" &&
				refUse.declaration === refOp)
		)
			continue
		// prototype definitions on an otherwise unreferenced constructor don't make it live
		if (
			refUse?.type === "MemberExpression" &&
			refUse.object === refOp &&
			memberNameOf(refUse) === "prototype"
		) {
			const [protoOp, protoUse] = operatorOf(refUse)
			if (
				protoUse?.type === "MemberExpression" &&
				protoUse.object === protoOp &&
				isDiscardedProtoMethodWrite(protoUse)
			)
				continue
		}
		return false
	}
	return !binding.exportNames.some(name => isExportUsed(module, name, ctx))
}

const isExportUsed = (
	module: SourceModule,
	exportName: string,
	ctx: ThisReadsContext,
	seen = new Set<string>()
): boolean => {
	const key = `${module.id}\0${exportName}`
	if (seen.has(key)) return false
	seen.add(key)
	if (ctx.entries.has(module.id) || ctx.exposed.has(module.id)) return true
	for (const edge of ctx.importersById.get(module.id) ?? []) {
		switch (edge.kind) {
			case "named":
				if (edge.name === exportName) return true
				break
			case "namespace":
			case "whole":
				return true
			case "reexport":
				if (
					edge.name === exportName &&
					isExportUsed(edge.module, edge.as, ctx, seen)
				)
					return true
				break
			case "star":
				if (
					exportName !== "default" &&
					isExportUsed(edge.module, exportName, ctx, seen)
				)
					return true
				break
		}
	}
	return false
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

const forwardingMethods = new Set(["apply", "call"])

const emptyNames: ReadonlySet<string> = new Set()

// the names read off what a node evaluates to, or "any" where it's read other
// than at a name, like `read(this)` or `this[k]`, or empty where it's passed
// as the receiver of a function proven to have its own `this` reads indexed
const namesReadOf = (
	node: Node,
	module: SourceModule,
	ctx: ThisReadsContext,
	seen = new Set<Binding>()
): ReadonlySet<string> | "any" => {
	const [operand, parent] = operatorOf(node)
	// e.g. `fn.apply(this, args)` in a debounce, where fn is proven to be an
	// indexed function whose own body records every `this` read, unless the
	// program may have patched `Function.prototype.call` or `.apply`
	if (
		!ctx.patchesBuiltins &&
		parent?.type === "CallExpression" &&
		parent.arguments[0] === operand &&
		parent.callee.type === "MemberExpression" &&
		forwardingMethods.has(String(memberNameOf(parent.callee))) &&
		isForwardingCallee(parent.callee.object, module, ctx)
	)
		return emptyNames
	if (parent?.type === "MemberExpression" && parent.object === operand) {
		// a plain assignment like `this.props = props` writes without reading the
		// previous value (an object literal's `init` validator property has no setter)
		const [memberOp, memberUse] = operatorOf(parent)
		if (
			memberUse?.type === "AssignmentExpression" &&
			memberUse.operator === "=" &&
			memberUse.left === memberOp
		)
			return emptyNames
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
			const read = namesReadOf(reference.id, module, ctx, seen)
			if (read === "any") return "any"
			for (const name of read) names.add(name)
		}
		return names
	}
	return "any"
}

// a function proven to be an arrow function (ignoring `this`) or a function
// declaration/expression whose own body `thisReadsOf` indexes — never a
// builtin like `Object.prototype.valueOf`, a class member, a reassigned
// binding, an unverified import, or an escaping parameter
const isForwardingCallee = (
	node: Node,
	module: SourceModule,
	ctx: ThisReadsContext,
	seen = new Set<Binding>()
): boolean => {
	const target = unwrapExpression(node)
	if (target.type === "ArrowFunctionExpression") return true
	if (
		target.type === "FunctionExpression" ||
		target.type === "FunctionDeclaration"
	) {
		if (target.type === "FunctionExpression" && target.id) {
			const idBinding = module.scopes.bindingsById.get(target.id)
			if (idBinding && mayOverrideForwarding(idBinding)) return false
		}
		return !isSkippedFunction(target, module, ctx)
	}
	if (target.type !== "Identifier") return false
	const binding = module.scopes.byId.get(target)?.binding
	return !!binding && isForwardingBinding(binding, module, ctx, seen)
}

const isForwardingBinding = (
	binding: Binding,
	module: SourceModule,
	ctx: ThisReadsContext,
	seen: Set<Binding>
): boolean => {
	if (
		seen.has(binding) ||
		binding.writes.length > 0 ||
		mayOverrideForwarding(binding)
	)
		return false
	seen.add(binding)
	switch (binding.kind) {
		case "function":
			return (
				binding.declaration.type === "FunctionDeclaration" &&
				!isSkippedFunction(binding.declaration, module, ctx)
			)
		case "const":
		case "let":
		case "var":
			if (
				binding.declaration.type !== "VariableDeclarator" ||
				binding.declaration.id !== binding.id ||
				!binding.declaration.init
			)
				return false
			return isForwardingCallee(binding.declaration.init, module, ctx, seen)
		case "param":
			return isForwardingParam(binding, module, ctx, seen)
		default:
			return false
	}
}

// whether any reference or export exposes the function to something other than
// calling it (or calling its `.call` / `.apply`), so an alias
// (`const g = f; g.call = ...`), helper (`patch(f)`), or importer may give it
// its own `call` or `apply`, or a prototype other than Function.prototype
const mayOverrideForwarding = (binding: Binding): boolean =>
	binding.exportNames.length > 0 ||
	binding.references.some(ref => {
		if (ref.isWrite) return true
		const [op, use] = operatorOf(ref.id)
		if (use?.type === "CallExpression" && use.callee === op) return false
		if (
			use?.type === "MemberExpression" &&
			use.object === op &&
			!isWriteTarget(use) &&
			forwardingMethods.has(String(memberNameOf(use)))
		) {
			const [memOp, memUse] = operatorOf(use)
			if (memUse?.type === "CallExpression" && memUse.callee === memOp)
				return false
		}
		return true
	})

const isForwardingParam = (
	binding: Binding,
	module: SourceModule,
	ctx: ThisReadsContext,
	seen: Set<Binding>
): boolean => {
	const fn = binding.declaration
	if (!isFunctionNode(fn)) return false
	const params = runtimeParamsOf(fn)
	const paramIndex = params.findIndex(
		param =>
			param === binding.id ||
			(param.type === "AssignmentPattern" && param.left === binding.id)
	)
	if (paramIndex === -1) return false
	const paramNode = params[paramIndex]
	const defaultValue =
		paramNode.type === "AssignmentPattern" ? paramNode.right : undefined
	if (defaultValue && !isForwardingCallee(defaultValue, module, ctx, seen))
		return false
	const calls = directCallsOfFunction(fn, module, ctx)
	if (!calls) return false
	return calls.every(({ call, module: callModule }) => {
		if (
			call.arguments
				.slice(0, paramIndex + 1)
				.some(arg => arg.type === "SpreadElement")
		)
			return false
		const arg = call.arguments[paramIndex]
		// omitted argument with no default yields undefined, which throws on .apply/.call
		if (!arg) return true
		return isForwardingCallee(arg, callModule, ctx, seen)
	})
}

const directCallsOfFunction = (
	fn: Node,
	module: SourceModule,
	ctx: ThisReadsContext
): CallSite[] | undefined => {
	if (
		fn.type === "FunctionExpression" &&
		fn.id &&
		module.scopes.bindingsById.get(fn.id)?.references.length
	)
		return
	const [op, parent] = operatorOf(fn)
	if (parent?.type === "CallExpression" && parent.callee === op)
		return [{ call: parent, module }]
	const calls: CallSite[] = []
	const seenBindings = new Set<Binding>()
	const seenExports = new Set<string>()
	if (
		parent?.type === "ExportDefaultDeclaration" &&
		parent.declaration === op
	) {
		return (
				collectExportCalls(
					module,
					"default",
					ctx,
					calls,
					seenBindings,
					seenExports
				)
			) ?
				calls
			:	undefined
	}
	const binding =
		fn.type === "FunctionDeclaration" ?
			fn.id && module.scopes.bindingsById.get(fn.id)
		: (
			parent?.type === "VariableDeclarator" &&
			parent.init === op &&
			parent.id.type === "Identifier"
		) ?
			module.scopes.bindingsById.get(parent.id)
		:	undefined
	if (!binding) return
	return (
			collectBindingCalls(
				binding,
				module,
				ctx,
				calls,
				seenBindings,
				seenExports
			)
		) ?
			calls
		:	undefined
}

const nonCallingGlobals = new Set([
	"String",
	"Boolean",
	"Number",
	"console.log",
	"console.warn",
	"console.error"
])

const isNonCallingFunctionRead = (
	operand: Node,
	parent: Node | undefined,
	module: SourceModule
): boolean => {
	if (!parent) return false
	if (parent.type === "ExpressionStatement") return true
	if (
		parent.type === "UnaryExpression" &&
		(parent.operator === "typeof" ||
			parent.operator === "!" ||
			parent.operator === "void")
	)
		return true
	if (parent.type === "CallExpression" && parent.callee !== operand) {
		const name = globalNameOf(unwrapExpression(parent.callee), module)
		return !!name && nonCallingGlobals.has(name)
	}
	return false
}

const collectBindingCalls = (
	binding: Binding,
	module: SourceModule,
	ctx: ThisReadsContext,
	calls: CallSite[],
	seenBindings: Set<Binding>,
	seenExports: Set<string>
): boolean => {
	if (seenBindings.has(binding)) return true
	seenBindings.add(binding)
	if (binding.writes.length > 0) return false
	for (const ref of binding.references) {
		if (ref.isWrite) return false
		const [op, use] = operatorOf(ref.id)
		if (
			use?.type === "ExportSpecifier" ||
			(use?.type === "ExportDefaultDeclaration" && use.declaration === op)
		)
			continue
		if (use?.type === "CallExpression" && use.callee === op) {
			calls.push({ call: use, module })
			continue
		}
		if (
			use?.type === "VariableDeclarator" &&
			use.init === op &&
			use.id.type === "Identifier"
		) {
			const alias = module.scopes.bindingsById.get(use.id)
			if (
				!alias ||
				!collectBindingCalls(
					alias,
					module,
					ctx,
					calls,
					seenBindings,
					seenExports
				)
			)
				return false
			continue
		}
		if (isNonCallingFunctionRead(op, use, module)) continue
		return false
	}
	for (const exportName of binding.exportNames) {
		if (
			!collectExportCalls(
				module,
				exportName,
				ctx,
				calls,
				seenBindings,
				seenExports
			)
		)
			return false
	}
	return true
}

const collectExportCalls = (
	module: SourceModule,
	exportName: string,
	ctx: ThisReadsContext,
	calls: CallSite[],
	seenBindings: Set<Binding>,
	seenExports: Set<string>
): boolean => {
	const key = `${module.id}\0${exportName}`
	if (seenExports.has(key)) return true
	seenExports.add(key)
	if (
		ctx.hasDynamicImport ||
		ctx.entries.has(module.id) ||
		ctx.exposed.has(module.id) ||
		module.scopes.isCommonJs
	)
		return false
	for (const edge of ctx.importersById.get(module.id) ?? []) {
		switch (edge.kind) {
			case "named":
				if (
					edge.name === exportName &&
					!collectBindingCalls(
						edge.binding,
						edge.module,
						ctx,
						calls,
						seenBindings,
						seenExports
					)
				)
					return false
				break
			case "reexport":
				if (
					edge.name === exportName &&
					!collectExportCalls(
						edge.module,
						edge.as,
						ctx,
						calls,
						seenBindings,
						seenExports
					)
				)
					return false
				break
			case "star":
				if (
					exportName !== "default" &&
					!collectExportCalls(
						edge.module,
						exportName,
						ctx,
						calls,
						seenBindings,
						seenExports
					)
				)
					return false
				break
			case "namespace":
				for (const ref of edge.binding.references) {
					if (ref.isWrite) return false
					const [nsOp, nsUse] = operatorOf(ref.id)
					if (
						nsUse?.type !== "MemberExpression" ||
						nsUse.object !== nsOp ||
						isWriteTarget(nsUse)
					)
						return false
					const readName = memberNameOf(nsUse)
					if (typeof readName !== "string") return false
					if (readName !== exportName) continue
					const [memOp, memUse] = operatorOf(nsUse)
					if (memUse?.type === "CallExpression" && memUse.callee === memOp)
						calls.push({ call: memUse, module: edge.module })
					else if (!isNonCallingFunctionRead(memOp, memUse, edge.module))
						return false
				}
				break
			case "whole":
				return false
		}
	}
	return true
}

// whether no escaped function can ever be called with `this === literal`:
// `literal` never escapes, inherits no prototype, has no spread or computed
// keys but constant ones, never invokes external or non-own members on itself, and its own inline
// methods/getters only read direct own members off `this`
const receivesNoEscapedThis = (
	literal: Extract<Node, { type: "ObjectExpression" }>,
	module: SourceModule,
	allowedCallKey: string | undefined
): boolean => {
	const ownKeys = new Set<string>()
	const inlineFnKeys = new Set<string>()
	let hasInlineThisOwner = false
	for (const prop of literal.properties) {
		if (prop.type !== "Property") return false
		const key =
			propertyKeyOf(prop) ??
			(prop.computed ? constantKeyOf(prop.key, module) : undefined)
		if (key === undefined) return false
		if (key === "__proto__" && !prop.computed && prop.kind === "init") {
			if (isNonNullProtoProperty(prop)) return false
			continue
		}
		ownKeys.add(key)
		if (prop.kind === "get" || prop.kind === "set") hasInlineThisOwner = true
		else {
			const value = unwrapExpression(prop.value)
			if (
				value.type === "FunctionExpression" ||
				value.type === "ArrowFunctionExpression"
			) {
				inlineFnKeys.add(key)
				if (value.type === "FunctionExpression") hasInlineThisOwner = true
			}
		}
	}
	const isOwnReadUse = (read: Node, use: Node | undefined): boolean => {
		if (
			use?.type === "MemberExpression" &&
			use.object === read &&
			!isWriteTarget(use)
		) {
			const name = memberNameOf(use)
			if (typeof name !== "string" || !ownKeys.has(name)) return false
			if (isDirectCallMember(use))
				return inlineFnKeys.has(name) || name === allowedCallKey
			return true
		}
		if (
			use?.type === "VariableDeclarator" &&
			use.init === read &&
			use.id.type === "ObjectPattern"
		) {
			return use.id.properties.every(property => {
				if (property.type !== "Property") return false
				const key = propertyKeyOf(property)
				return key !== undefined && ownKeys.has(key)
			})
		}
		return false
	}
	const [operand, parent] = operatorOf(literal)
	if (
		parent?.type === "VariableDeclarator" &&
		parent.init === operand &&
		parent.id.type === "Identifier"
	) {
		const binding = module.scopes.bindingsById.get(parent.id)
		if (
			!binding ||
			binding.kind !== "const" ||
			binding.exportNames.length ||
			binding.writes.length
		)
			return false
		if (
			!binding.references.every(reference => {
				if (reference.isWrite) return false
				const [read, use] = operatorOf(reference.id)
				return isOwnReadUse(read, use)
			})
		)
			return false
	} else if (!isOwnReadUse(operand, parent)) return false

	if (!hasInlineThisOwner) return true
	let escapesThis = false
	walk(literal, node => {
		if (escapesThis) return false
		if (node.type === "Super") {
			const owner = enclosingThisFunctionOf(node)
			if (
				owner &&
				owner.parent?.type === "Property" &&
				owner.parent.value === owner &&
				owner.parent.parent === literal
			)
				escapesThis = true
			return true
		}
		if (node.type !== "ThisExpression") return true
		const owner = enclosingThisFunctionOf(node)
		if (
			owner &&
			owner.parent?.type === "Property" &&
			owner.parent.value === owner &&
			owner.parent.parent === literal &&
			!isDirectOwnThisRead(node, ownKeys, inlineFnKeys, allowedCallKey, module)
		)
			escapesThis = true
		return true
	})
	return !escapesThis
}

const isDirectOwnThisRead = (
	node: Node,
	ownKeys: ReadonlySet<string>,
	inlineFnKeys: ReadonlySet<string>,
	allowedCallKey: string | undefined,
	module: SourceModule,
	seen = new Set<Binding>()
): boolean => {
	const [operand, parent] = operatorOf(node)
	if (
		parent?.type === "MemberExpression" &&
		parent.object === operand &&
		!isWriteTarget(parent)
	) {
		const name = memberNameOf(parent)
		if (typeof name !== "string" || !ownKeys.has(name)) return false
		if (isDirectCallMember(parent))
			return inlineFnKeys.has(name) || name === allowedCallKey
		return true
	}
	if (parent?.type === "VariableDeclarator" && parent.init === operand) {
		if (parent.id.type === "ObjectPattern") {
			return parent.id.properties.every(property => {
				if (property.type !== "Property") return false
				const key = propertyKeyOf(property)
				return key !== undefined && ownKeys.has(key)
			})
		}
		const binding =
			parent.id.type === "Identifier" ?
				module.scopes.bindingsById.get(parent.id)
			:	undefined
		if (!binding || binding.writes.length || seen.has(binding)) return false
		seen.add(binding)
		return binding.references.every(
			reference =>
				!reference.isWrite &&
				isDirectOwnThisRead(
					reference.id,
					ownKeys,
					inlineFnKeys,
					allowedCallKey,
					module,
					seen
				)
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
		// a non-null __proto__ inherits getters/methods that run with `this === literal`
		if (key === "__proto__" && !prop.computed && prop.kind === "init") {
			if (isNonNullProtoProperty(prop)) return false
			continue
		}
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
		const isDirectCall = isDirectCallMember(use)
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
		if (node.type === "Super") {
			const owner = enclosingThisFunctionOf(node)
			if (
				owner &&
				owner.parent?.type === "Property" &&
				owner.parent.value === owner &&
				owner.parent.parent === literal
			)
				leaksThis = true
			return true
		}
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
			const isDirectCall = isDirectCallMember(parent)
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
		return !!name && nonCallingGlobals.has(name)
	}
	return false
}
