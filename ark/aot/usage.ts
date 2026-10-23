import { parseSync, type Node, type Span } from "oxc-parser"
import { memberNameOf } from "./graph.ts"
import type { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isWriteTarget,
	operatorOf,
	walk,
	type Binding
} from "./scope.ts"

// what a read of a validator needs besides .allows, or "call" where it may
// return errors no one reads
export type UsedMember = "assert" | "~standard" | "meta" | "methods" | "call"

const usedMembersByName: Record<string, UsedMember | null> =
	Object.setPrototypeOf(
		{
			allows: null,
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
	modules: ReadonlyMap<string, RuntimeModule>
	// the module a specifier resolves to, if the program holds it
	resolve: (specifier: string, importer: string) => string | undefined
}

// the members some read of a validator needs, or undefined where one
// reaches code that may read anything
export const usedMembersOf = (
	program: UsageProgram
): Set<UsedMember> | undefined => {
	const analysis = new UsageAnalysis(program)
	try {
		analysis.analyze()
	} catch (e) {
		if (e === escaped) return
		throw e
	}
	return analysis.used
}

const escaped = Symbol("escaped")

const escape = (): never => {
	throw escaped
}

type ImportEdge =
	| { kind: "named"; name: string; binding: Binding; importer: RuntimeModule }
	| { kind: "namespace"; binding: Binding; importer: RuntimeModule }
	| { kind: "reexport"; name: string; as: string; importer: RuntimeModule }
	| { kind: "star"; importer: RuntimeModule }
	// e.g. import(), require() or `export * as ns`, handing over every export
	| { kind: "whole" }
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
			if (runtime.holdsOther) escape()
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
						{ kind: "whole" }
					:	{ kind: "star", importer: runtime }
				)
			} else if (statement.type === "TSImportEqualsDeclaration") {
				if (statement.moduleReference.type === "TSExternalModuleReference")
					add(statement.moduleReference.expression.value, { kind: "whole" })
			}
		}
		for (const specifier in runtime.inputs) {
			for (const name of runtime.inputs[specifier])
				add(specifier, { kind: "input", name })
		}
		for (const { id, binding } of module.scopes.root.unresolved) {
			if (binding) continue
			// direct eval reads any binding in scope
			if (id.name === "eval") escape()
			if (id.name !== "require") continue
			const [operand, parent] = operatorOf(id)
			const specifier =
				parent?.type === "CallExpression" && parent.callee === operand ?
					literalOf(parent.arguments[0])
				:	undefined
			if (specifier === undefined) return escape()
			add(specifier, { kind: "whole" })
		}
		walk(module.program, node => {
			if (node.type === "ImportExpression") {
				const specifier = literalOf(node.source)
				if (specifier === undefined) return escape()
				add(specifier, { kind: "whole" })
			} else if (
				node.type === "MetaProperty" &&
				node.meta.name === "import" &&
				!isInertMetaRead(node)
			)
				// e.g. import.meta.glob() or a worker's URL, reaching modules unseen
				escape()
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
			)
				escape()
			return this.readBinding(
				runtime.module.scopes.bindingsById.get(parent.id)!,
				runtime
			)
		}
		this.read(operand, parent)
	}

	private readBinding(binding: Binding, runtime: RuntimeModule): void {
		if (this.readBindings.has(binding)) return
		this.readBindings.add(binding)
		if (
			binding.writes.length ||
			(binding.kind !== "const" && binding.kind !== "import") ||
			runtime.passed.includes(binding)
		)
			escape()
		for (const reference of binding.references) {
			if (reference.isWrite) escape()
			if (isDead(reference.id, runtime)) continue
			const [operand, parent] = operatorOf(reference.id)
			// read by importers through the export
			if (
				parent?.type === "ExportSpecifier" ||
				parent?.type === "ExportDefaultDeclaration"
			)
				continue
			this.read(operand, parent)
		}
		for (const name of binding.exportNames) this.readExport(runtime, name)
	}

	private readExport(runtime: RuntimeModule, name: string): void {
		const id = runtime.module.id
		const key = `${id}\0${name}`
		if (this.readExports.has(key)) return
		this.readExports.add(key)
		if (this.program.entries.has(id)) escape()
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
					escape()
					break
				case "input":
					if (edge.name === name) escape()
			}
		}
	}

	// `ns.T` reads the export, and nothing else may read the namespace
	private readNamespace(
		binding: Binding,
		runtime: RuntimeModule,
		name: string
	): void {
		if (binding.exportNames.length || runtime.passed.includes(binding)) escape()
		for (const reference of binding.references) {
			if (isDead(reference.id, runtime)) continue
			const [operand, parent] = operatorOf(reference.id)
			if (
				parent?.type !== "MemberExpression" ||
				parent.object !== operand ||
				isWriteTarget(parent)
			)
				return escape()
			const read = memberNameOf(parent)
			if (typeof read !== "string") return escape()
			if (read !== name) continue
			const [member, memberParent] = operatorOf(parent)
			this.read(member, memberParent)
		}
	}

	// a validator read at `node`, as its parent reads it
	private read(node: Node, parent: Node | null | undefined): void {
		if (parent?.type === "CallExpression" && parent.callee === node) {
			this.used.add("call")
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
				return
			}
		}
		escape()
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

// e.g. import.meta.env.PROD, which loads nothing
const isInertMetaRead = (node: Node): boolean => {
	const parent = node.parent
	return (
		parent?.type === "MemberExpression" &&
		parent.object === node &&
		(memberNameOf(parent) === "env" ||
			memberNameOf(parent) === "dirname" ||
			memberNameOf(parent) === "filename")
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
	return [...nodesByRange.values()].map(node => node ?? escape())
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
