import * as arkregex from "arkregex"
import * as arktype from "arktype"
import type {
	ArrowFunctionExpression,
	Function,
	ImportSpecifier,
	Node
} from "oxc-parser"
import type { PrecompileHost } from "./host.ts"
import { SourceModule } from "./module.ts"
import { exportNameOf, type Binding } from "./scope.ts"

export type FunctionNode = Function | ArrowFunctionExpression

const arktypeNamespacesBySpecifier: Record<string, object> =
	Object.setPrototypeOf(
		{
			arktype,
			"arktype/config": arktype,
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
	| { kind: "arktype"; name: string; value: unknown }
	| { kind: "binding"; module: SourceModule; binding: Binding; name: string }
	| { kind: "namespace"; module: SourceModule }
	| { kind: "expression"; module: SourceModule; node: Node }
	| { kind: "json"; id: string; value: unknown }
	| { kind: "unresolved"; message: string }

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
				kind: "arktype",
				name: specifier,
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
				kind: "unresolved",
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
			if (target.kind !== "arktype" || declaration.type !== "ImportSpecifier")
				return target
			const name = exportNameOf(declaration.imported)
			return {
				kind: "arktype",
				name,
				value: Reflect.get(target.value as object, name)
			}
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
						return target.kind === "arktype" && entry.kind === "reexport" ?
								{
									kind: "arktype",
									name: entry.name,
									value: Reflect.get(target.value as object, entry.name)
								}
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
			for (const specifier of module.scopes.starExports) {
				const target = this.resolve(specifier, module)
				if (!(target instanceof SourceModule)) continue
				const result = this.exportOf(target, name, seen)
				if (result.kind !== "unresolved") return result
			}
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

	isArkExpression(node: Node, module: SourceModule): boolean {
		node = unwrapExpression(node)
		while (node.type === "MemberExpression" || node.type === "CallExpression") {
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
		walkExpressions(body, node => {
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
	walkExpressions(fn.body!, node => {
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

export const contains = (outer: Node, inner: Node): boolean =>
	outer.start <= inner.start && inner.end <= outer.end

export const unwrapExpression = (node: Node): Node => {
	while (
		node.type === "TSAsExpression" ||
		node.type === "TSSatisfiesExpression" ||
		node.type === "TSTypeAssertion" ||
		node.type === "TSNonNullExpression" ||
		node.type === "TSInstantiationExpression" ||
		node.type === "ParenthesizedExpression" ||
		node.type === "ChainExpression"
	)
		node = node.expression
	return node
}

const walkExpressions = (node: Node, visit: (node: Node) => boolean): void => {
	if (!visit(node)) return
	for (const k in node) {
		if (k === "parent") continue
		const child = (node as never)[k] as unknown
		if (Array.isArray(child)) {
			for (const item of child) {
				if (item && typeof item === "object" && "type" in item)
					walkExpressions(item, visit)
			}
		} else if (child && typeof child === "object" && "type" in child)
			walkExpressions(child as Node, visit)
	}
}
