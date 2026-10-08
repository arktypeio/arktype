import * as arkregex from "arkregex"
import * as arktype from "arktype"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as arktypeConfig from "arktype/config"
import type {
	ArrowFunctionExpression,
	Function,
	ImportSpecifier,
	Node
} from "oxc-parser"
import type { PrecompileHost } from "./host.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	unwrapExpression,
	walk,
	type Binding,
	type Reference
} from "./scope.ts"

export type FunctionNode = Function | ArrowFunctionExpression

export type ArkExportName =
	| keyof typeof arktype
	| keyof typeof arktypeConfig
	| keyof typeof arkregex

const arktypeNamespacesBySpecifier: Record<string, object> =
	Object.setPrototypeOf(
		{
			arktype,
			"arktype/config": arktypeConfig,
			"@ark/type": arktype,
			arkregex,
			"@ark/regex": arkregex
		},
		null
	)

// arktype's exports that a standalone build's runtime provides
export const runtimeExports: Record<string, 1> = Object.setPrototypeOf(
	{
		ArkError: 1,
		ArkErrors: 1,
		ParseError: 1,
		Traversal: 1,
		TraversalError: 1
	},
	null
)

// members of a Type that validate, which run at runtime in every mode
export const runtimeMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		assert: 1,
		allows: 1,
		from: 1,
		traverse: 1,
		"~standard": 1
	},
	null
)

// members derived from registry names or node ids, which differ between the build and runtime
export const unstableArkMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		id: 1,
		hash: 1,
		innerHash: 1,
		json: 1,
		typeJson: 1,
		innerJson: 1,
		metaJson: 1,
		collapsibleJson: 1,
		toJSON: 1,
		references: 1,
		shallowReferences: 1,
		precompilation: 1
	},
	null
)

export type ImportTarget =
	| { kind: "arktype"; name: ArkExportName; value: unknown }
	| { kind: "arktypeNamespace"; specifier: string; value: object }
	| { kind: "binding"; module: SourceModule; binding: Binding; name: string }
	| { kind: "namespace"; module: SourceModule }
	| { kind: "expression"; module: SourceModule; node: Node }
	| { kind: "json"; id: string; value: unknown }
	| { kind: "unresolved"; message: string }
	// a package the build does not follow, whose values are known only at runtime
	| { kind: "package"; message: string }

export class ModuleGraph {
	host: PrecompileHost
	private modulesById: Record<string, SourceModule | ImportTarget> =
		Object.create(null)
	private arkBindings = new Map<Binding, boolean>()
	private importsById: Record<string, string[]> = Object.create(null)

	constructor(host: PrecompileHost) {
		this.host = host
	}

	add(id: string, source: string): SourceModule {
		const module = new SourceModule(id, source)
		this.modulesById[id] = module
		return module
	}

	resolve(
		specifier: string,
		importer: SourceModule
	): ImportTarget | SourceModule {
		if (specifier in arktypeNamespacesBySpecifier) {
			return {
				kind: "arktypeNamespace",
				specifier,
				value: arktypeNamespacesBySpecifier[specifier]
			}
		}
		const id = this.host.resolve(specifier, importer.id)
		if (!id) {
			return {
				kind: "unresolved",
				message: `\`${specifier}\` cannot be resolved from ${importer.id}`
			}
		}
		if (id.includes("/node_modules/")) {
			return {
				kind: "package",
				message: `\`${specifier}\` is a package the build does not read`
			}
		}
		const imports = (this.importsById[importer.id] ??= [])
		if (!imports.includes(id)) imports.push(id)
		this.modulesById[id] ??= this.load(id, specifier)
		return this.modulesById[id]
	}

	private load(id: string, specifier: string): SourceModule | ImportTarget {
		const source = this.host.readFile(id)
		if (source === undefined)
			return { kind: "unresolved", message: `${id} cannot be read` }
		if (id.endsWith(".json")) {
			try {
				return { kind: "json", id, value: JSON.parse(source) }
			} catch {
				return { kind: "unresolved", message: `${id} is not valid JSON` }
			}
		}
		if (!/\.[cm]?[jt]sx?$/.test(id)) {
			return {
				kind: "unresolved",
				message: `\`${specifier}\` is not a JavaScript or TypeScript module`
			}
		}
		return new SourceModule(id, source)
	}

	dependenciesOf(id: string): string[] {
		const result = [id]
		for (let i = 0; i < result.length; i++) {
			for (const dependency of this.importsById[result[i]] ?? [])
				if (!result.includes(dependency)) result.push(dependency)
		}
		return result
	}

	importOf(binding: Binding, module: SourceModule): ImportTarget {
		const declaration = binding.declaration
		const source =
			(
				declaration.type === "ImportSpecifier" ||
				declaration.type === "ImportDefaultSpecifier" ||
				declaration.type === "ImportNamespaceSpecifier"
			) ?
				(declaration.parent as Extract<Node, { type: "ImportDeclaration" }>)
					.source.value
			:	undefined
		if (source === undefined) {
			return {
				kind: "unresolved",
				message: `\`${binding.name}\` is a TypeScript import-equals declaration`
			}
		}
		const target = this.resolve(source, module)
		if (!(target instanceof SourceModule)) {
			return (
					target.kind !== "arktypeNamespace" ||
						declaration.type === "ImportNamespaceSpecifier"
				) ?
					target
				:	arktypeExportOf(
						target,
						declaration.type === "ImportSpecifier" ?
							exportNameOf(declaration.imported)
						:	"default"
					)
		}
		return (
			declaration.type === "ImportNamespaceSpecifier" ?
				{ kind: "namespace", module: target }
			: declaration.type === "ImportDefaultSpecifier" ?
				this.exportOf(target, "default")
			:	this.exportOf(
					target,
					exportNameOf((declaration as ImportSpecifier).imported)
				)
		)
	}

	exportOf(
		module: SourceModule,
		name: string,
		seen = new Set<SourceModule>()
	): ImportTarget {
		const entry = module.scopes.exportsByName[name]
		if (entry) {
			switch (entry.kind) {
				case "binding":
					return entry.binding.kind === "import" ?
							this.importOf(entry.binding, module)
						:	{ kind: "binding", module, binding: entry.binding, name }
				case "expression":
					return { kind: "expression", module, node: entry.node }
				case "reexport":
				case "namespace": {
					const target = this.resolve(entry.specifier, module)
					if (!(target instanceof SourceModule)) {
						return (
								target.kind === "arktypeNamespace" && entry.kind === "reexport"
							) ?
								arktypeExportOf(target, entry.name)
							:	target
					}
					return entry.kind === "namespace" ?
							{ kind: "namespace", module: target }
						:	this.exportOf(target, entry.name)
				}
			}
		}
		if (name !== "default" && !seen.has(module)) {
			seen.add(module)
			// a name a package may export is known only if no other module exports it
			let packageExport: ImportTarget | undefined
			for (const specifier of module.scopes.starExports) {
				const target = this.resolve(specifier, module)
				const result =
					target instanceof SourceModule ? this.exportOf(target, name, seen)
					: target.kind === "arktypeNamespace" ? arktypeExportOf(target, name)
					: target.kind === "package" ? target
					: undefined
				if (result?.kind === "package") packageExport ??= result
				else if (result && result.kind !== "unresolved") return result
			}
			if (packageExport) return packageExport
		}
		return {
			kind: "unresolved",
			message: `${module.id} has no export \`${name}\``
		}
	}

	isArkBinding(binding: Binding, module: SourceModule): boolean {
		const cached = this.arkBindings.get(binding)
		if (cached !== undefined) return cached
		this.arkBindings.set(binding, false)
		let result = false
		if (binding.kind === "import") {
			const target = this.importOf(binding, module)
			result =
				target.kind === "arktype" ? !(target.name in runtimeExports)
				: target.kind === "arktypeNamespace" ? true
				: target.kind === "binding" ?
					this.isArkBinding(target.binding, target.module)
				:	target.kind === "expression" &&
					this.isArkExpression(target.node, target.module)
		} else if (
			(binding.kind === "const" || binding.kind === "let") &&
			!binding.writes.length &&
			binding.declaration.type === "VariableDeclarator" &&
			binding.declaration.init
		)
			result = this.isArkExpression(binding.declaration.init, module)
		this.arkBindings.set(binding, result)
		return result
	}

	// e.g. `type` imported from arktype, or `ark.type` with `ark` its namespace
	arkExportOf(
		reference: Reference,
		module: SourceModule
	): [name: ArkExportName, node: Node] | undefined {
		const binding = reference.binding
		if (binding?.kind !== "import" || reference.isWrite) return
		const target = this.importOf(binding, module)
		if (target.kind === "arktype") return [target.name, reference.id]
		const member = reference.id.parent
		if (
			target.kind !== "arktypeNamespace" ||
			member?.type !== "MemberExpression" ||
			member.object !== reference.id ||
			member.computed
		)
			return
		const exported = arktypeExportOf(target, member.property.name)
		return exported.kind === "arktype" ? [exported.name, member] : undefined
	}

	isArkExpression(node: Node, module: SourceModule): boolean {
		node = unwrapExpression(node)
		while (
			node.type === "MemberExpression" ||
			node.type === "CallExpression" ||
			node.type === "ChainExpression"
		) {
			if (node.type === "ChainExpression") {
				node = unwrapExpression(node.expression)
				continue
			}
			if (node.type === "CallExpression") {
				const helper = this.helperOf(node.callee, module)
				if (helper && this.isArkHelper(helper[0], helper[1])) return true
			}
			node = unwrapExpression(
				node.type === "MemberExpression" ? node.object : node.callee
			)
		}
		const binding =
			node.type === "Identifier" ?
				module.scopes.referencesById.get(node)?.binding
			:	undefined
		return !!binding && this.isArkBinding(binding, module)
	}

	helperOf(
		callee: Node,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		callee = unwrapExpression(callee)
		let binding: Binding | undefined
		if (callee.type === "Identifier")
			binding = module.scopes.referencesById.get(callee)?.binding
		else if (
			callee.type === "MemberExpression" &&
			!callee.computed &&
			callee.object.type === "Identifier"
		) {
			const namespace = module.scopes.referencesById.get(callee.object)?.binding
				?.declaration
			if (namespace?.type !== "ImportNamespaceSpecifier") return
			const target = this.resolve(
				(namespace.parent as Extract<Node, { type: "ImportDeclaration" }>)
					.source.value,
				module
			)
			if (!(target instanceof SourceModule)) return
			const exported = this.exportOf(target, callee.property.name)
			return exported.kind === "binding" ?
					this.boundHelperOf(exported.binding, exported.module)
				:	undefined
		}
		return binding && this.boundHelperOf(binding, module)
	}

	boundHelperOf(
		binding: Binding,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		if (binding.kind === "import") {
			const target = this.importOf(binding, module)
			return target.kind === "binding" ?
					this.boundHelperOf(target.binding, target.module)
				:	undefined
		}
		if (binding.writes.length) return
		const fn =
			binding.kind === "function" ? binding.declaration
			: (
				binding.kind === "const" &&
				binding.declaration.type === "VariableDeclarator"
			) ?
				binding.declaration.init && unwrapExpression(binding.declaration.init)
			:	undefined
		return fn && isFunctionNode(fn) && staticBodyOf(fn) && !readsArguments(fn) ?
				[fn, module]
			:	undefined
	}

	isArkHelper(fn: FunctionNode, module: SourceModule): boolean {
		const body = staticBodyOf(fn)!
		let result = false
		walk(body, node => {
			if (result || isFunctionNode(node)) return false
			if (node.type === "Identifier") {
				const binding = module.scopes.referencesById.get(node)?.binding
				if (
					binding &&
					binding.scope.node !== fn &&
					this.isArkBinding(binding, module)
				)
					result = true
			}
			return !result
		})
		return result
	}
}

const arktypeExportOf = (
	namespace: Extract<ImportTarget, { kind: "arktypeNamespace" }>,
	name: string
): ImportTarget =>
	name in namespace.value ?
		{
			kind: "arktype",
			name: name as ArkExportName,
			value: Reflect.get(namespace.value, name)
		}
	:	{
			kind: "unresolved",
			message: `\`${namespace.specifier}\` has no export \`${name}\``
		}

export const isFunctionNode = (node: Node): node is FunctionNode =>
	node.type === "ArrowFunctionExpression" ||
	node.type === "FunctionExpression" ||
	node.type === "FunctionDeclaration"

export const staticBodyOf = (fn: FunctionNode): Node | undefined => {
	if (fn.async || fn.generator || !fn.body) return
	if (fn.body.type !== "BlockStatement") return fn.body
	const statements = fn.body.body.filter(
		statement => !("directive" in statement && statement.directive)
	)
	return statements.length === 1 && statements[0].type === "ReturnStatement" ?
			(statements[0].argument ?? undefined)
		:	undefined
}

// `arguments` aliases each argument, so a parameter does not show where its argument goes
const readsArguments = (fn: FunctionNode): boolean => {
	if (fn.type === "ArrowFunctionExpression") return false
	let result = false
	walk(fn.body!, node => {
		if (node.type === "Identifier" && node.name === "arguments") result = true
		return (
			!result &&
			!(
				node.type === "FunctionExpression" ||
				node.type === "FunctionDeclaration"
			)
		)
	})
	return result
}

// the binding a function or class is declared as, or a `const` holding it
export const bindingOfFunction = (
	node: Node,
	module: SourceModule
): Binding | undefined => {
	const id =
		node.type === "FunctionDeclaration" || node.type === "ClassDeclaration" ?
			node.id
		: node.parent?.type === "VariableDeclarator" && node.parent.init === node ?
			node.parent.id
		:	undefined
	return id ? module.scopes.bindingsById.get(id) : undefined
}

export const enclosingFunctionOf = (node: Node): FunctionNode | undefined => {
	for (let parent = node.parent; parent; parent = parent.parent)
		if (isFunctionNode(parent)) return parent
}

export const contains = (outer: Node, inner: Node): boolean =>
	outer.start <= inner.start && inner.end <= outer.end
