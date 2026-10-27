import { parseSync, type Node, type Span } from "oxc-parser"
import { memberNameOf } from "./graph.ts"
import type { SourceModule } from "./module.ts"
import { isInertMetaProperty } from "./scan.ts"
import {
	exportNameOf,
	isWriteTarget,
	operatorOf,
	walk,
	type Binding
} from "./scope.ts"

// what a read of a validator needs: a member, "call" where it may return
// errors no one reads, or "piped" where a call may pass a second argument
export type UsedMember =
	| "assert"
	| "~standard"
	| "meta"
	| "methods"
	| "allows"
	| "call"
	| "piped"

const usedMembersByName: Record<string, UsedMember | null> =
	Object.setPrototypeOf(
		{
			allows: "allows",
			assert: "assert",
			"~standard": "~standard",
			meta: "meta",
			traverse: "methods",
			from: "methods",
			toString: "methods"
		},
		null
	)

// a module of a bundle as its precompiled code runs
export interface RuntimeModule {
	module: SourceModule
	// the sites it folds, replacing their text
	folded: Span[]
	// text inside them a site's call keeps
	kept: Span[]
	// bindings a factory reads at runtime
	passed: Binding[]
	// what factories import from other modules, by specifier
	inputs: Record<string, string[]>
	// each site creating a validator
	validators: Span[]
	// a site creating a Module, Scope or Generic, which holds validators
	holdsOther: boolean
}

export interface UsageProgram {
	entries: ReadonlySet<string>
	// e.g. a module a framework's runtime imports, as its exports are read
	exposed: ReadonlySet<string>
	modules: ReadonlyMap<string, RuntimeModule>
	// the module a specifier resolves to, if the program holds it
	resolve: (specifier: string, importer: string) => string | undefined
}

// the members some read of a validator needs, or why one reaches code that
// may read anything
export const usedMembersOf = (
	program: UsageProgram
): Set<UsedMember> | string => {
	const analysis = new UsageAnalysis(program)
	try {
		analysis.analyze()
	} catch (e) {
		if (e instanceof Escape) return e.reason
		throw e
	}
	return analysis.used
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
	private program: UsageProgram
	private edgesByTarget = new Map<string, ImportEdge[]>()
	private readBindings = new Set<Binding>()
	private readExports = new Set<string>()

	constructor(program: UsageProgram) {
		this.program = program
	}

	analyze(): void {
		for (const runtime of this.program.modules.values()) this.link(runtime)
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

	// what each module imports, by the module it resolves to
	private link(runtime: RuntimeModule): void {
		const { module } = runtime
		const add = (specifier: string, edge: ImportEdge) => {
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
			const specifier =
				parent?.type === "CallExpression" && parent.callee === operand ?
					literalOf(parent.arguments[0])
				:	undefined
			if (specifier === undefined) {
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

	private readValue(node: Node, runtime: RuntimeModule): void {
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
				runtime
			)
		}
		this.read(operand, parent, runtime)
	}

	private readBinding(binding: Binding, runtime: RuntimeModule): void {
		if (this.readBindings.has(binding)) return
		this.readBindings.add(binding)
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
			this.read(operand, parent, runtime)
		}
		for (const name of binding.exportNames) this.readExport(runtime, name)
	}

	private readExport(runtime: RuntimeModule, name: string): void {
		const id = runtime.module.id
		const key = `${id}\0${name}`
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
					if (edge.name === name) this.readBinding(edge.binding, edge.importer)
					break
				case "namespace":
					this.readNamespace(edge.binding, edge.importer, name)
					break
				case "reexport":
					if (edge.name === name) this.readExport(edge.importer, edge.as)
					break
				case "star":
					if (name !== "default") this.readExport(edge.importer, name)
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
		name: string
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
			this.read(member, memberParent, runtime)
		}
	}

	// a validator read at `node`, as its parent reads it
	private read(
		node: Node,
		parent: Node | null | undefined,
		runtime: RuntimeModule
	): void {
		const { module } = runtime
		// a choice between validators, like `import.meta.env.DEV ? DevPost : Post`,
		// is read as its result is
		if (
			(parent?.type === "ConditionalExpression" && parent.test !== node) ||
			parent?.type === "LogicalExpression"
		)
			return this.readValue(parent, runtime)
		if (parent?.type === "CallExpression" && parent.callee === node) {
			this.used.add("call")
			this.readArguments(parent)
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
		escape(
			`${module.positionOf(node)} ${unfollowedReadOf(node, parent, module)}`
		)
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

const literalOf = (node: Node | undefined): string | undefined =>
	node?.type === "Literal" && typeof node.value === "string" ? node.value
	: (
		node?.type === "TemplateLiteral" &&
		!node.expressions.length &&
		node.quasis[0].value.cooked !== null
	) ?
		node.quasis[0].value.cooked
	:	undefined

// how a read the analysis doesn't follow reads a validator
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
const isDead = (node: Span, runtime: RuntimeModule): boolean =>
	runtime.folded.some(span => isIn(node, span)) &&
	!runtime.kept.some(span => isIn(node, span))

const isIn = (node: Span, span: Span) =>
	span.start <= node.start && node.end <= span.end

// the innermost node at each span
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

// a module no site of which the host folds
export const unprecompiled = (module: SourceModule): RuntimeModule => ({
	module,
	folded: [],
	kept: [],
	passed: [],
	inputs: {},
	validators: [],
	holdsOther: false
})

// whether each factory a module of validators exports reads what a call
// passes it, other than the index a shared factory takes first, e.g. not a
// production build's, which checks no Type it's passed
export const passedReaderOf = (
	code: string
): ((exported: string) => boolean) => {
	let functionsByExport: Map<string, Node | undefined> | undefined
	return exported => {
		functionsByExport ??= exportedFunctionsOf(code)
		const fn = functionsByExport.get(exported)
		if (
			fn?.type !== "ArrowFunctionExpression" &&
			fn?.type !== "FunctionExpression" &&
			fn?.type !== "FunctionDeclaration"
		)
			return true
		const names = new Set<string>(["arguments"])
		for (const [i, param] of fn.params.entries()) {
			if (param.type !== "Identifier") return true
			if (i || param.name !== "index") names.add(param.name)
		}
		let reads = false
		walk(fn.body!, node => {
			reads ||= node.type === "Identifier" && names.has(node.name)
			return !reads
		})
		return reads
	}
}

const exportedFunctionsOf = (code: string): Map<string, Node | undefined> => {
	const { program } = parseSync("validators.js", code)
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
