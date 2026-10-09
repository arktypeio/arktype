import { Callable } from "@ark/util"
import * as arkregex from "arkregex"
import * as arktype from "arktype"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as arktypeConfig from "arktype/config"
import type { Validator } from "arktype/internal/runtime.ts"
import type {
	ArrowFunctionExpression,
	Function,
	ImportSpecifier,
	MemberExpression,
	Node
} from "oxc-parser"
import { join, relative } from "node:path"
import { isArkValue } from "./builtins.ts"
import { dependencyOf, optsIn, type PrecompileHost } from "./host.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isTransparent,
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

const arkExports = new Set(
	Object.values(arktypeNamespacesBySpecifier).flatMap(namespace =>
		Object.entries(namespace).flatMap(([name, value]) =>
			name in runtimeExports ? [] : [value]
		)
	)
)

// what the standalone runtime freezes: arktype's exports and parsers, and its Types, Scopes, Modules and Generics
export const isArkObject = (value: unknown): boolean =>
	isArkValue(value) || value instanceof Callable || arkExports.has(value)

export const runtimeMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		assert: 1,
		allows: 1,
		from: 1,
		traverse: 1,
		traverseAllows: 1,
		traverseApply: 1,
		"~standard": 1
	},
	null
)

// a Type's members a standalone validator has, so reading any other at runtime in a standalone build throws or reads nothing
export const validatorMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		expression: 1,
		description: 1,
		meta: 1,
		allows: 1,
		assert: 1,
		traverse: 1,
		from: 1,
		"~standard": 1
	} satisfies Record<Exclude<keyof Validator, keyof globalThis.Function>, 1>,
	null
)

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
	cwd: string | undefined
	private modulesById: Record<string, SourceModule | ImportTarget> =
		Object.create(null)
	private arkBindings = new Map<Binding, boolean>()
	private importsById: Record<string, string[]> = Object.create(null)
	private optsInByPackage: Record<string, boolean> = Object.create(null)

	constructor(host: PrecompileHost, cwd?: string) {
		this.host = host
		this.cwd = cwd
	}

	pathOf(id: string): string {
		return this.cwd === undefined ? id : relative(this.cwd, id)
	}

	add(id: string, source: string): SourceModule {
		const module = new SourceModule(id, source, this.pathOf(id))
		this.modulesById[id] = module
		return module
	}

	moduleOf(id: string): SourceModule | ImportTarget {
		return (this.modulesById[id] ??= this.load(id, this.pathOf(id)))
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
				message: `\`${specifier}\` cannot be resolved from ${importer.path}`
			}
		}
		if (!this.isFollowed(id)) {
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

	// a module outside node_modules, or in a package whose package.json opts in
	isFollowed(id: string): boolean {
		const [root] = dependencyOf(id) ?? []
		return (
			root === undefined ||
			(this.optsInByPackage[root] ??= optsIn(
				this.host.readFile(join(root, "package.json"))
			))
		)
	}

	private load(id: string, specifier: string): SourceModule | ImportTarget {
		const source = this.host.readFile(id)
		if (source === undefined) {
			return {
				kind: "unresolved",
				message: `${this.pathOf(id)} cannot be read`
			}
		}
		if (id.endsWith(".json")) {
			try {
				return { kind: "json", id, value: JSON.parse(source) }
			} catch {
				return {
					kind: "unresolved",
					message: `${this.pathOf(id)} is not valid JSON`
				}
			}
		}
		if (!/\.[cm]?[jt]sx?$/.test(id)) {
			return {
				kind: "unresolved",
				message: `\`${specifier}\` is not a JavaScript or TypeScript module`
			}
		}
		return new SourceModule(id, source, this.pathOf(id))
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
			message: `${module.path} has no export \`${name}\``
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

	// e.g. `T.assert` or `type.errors`, which run at runtime in every mode, or `T.json`, which differs between the build and runtime
	isRuntimeMember(member: MemberExpression, module: SourceModule): boolean {
		const name =
			member.computed ?
				member.property.type === "Literal" ?
					member.property.value
				:	undefined
			:	member.property.name
		if (typeof name !== "string") return false
		if (name in runtimeMembers || name in unstableArkMembers) return true
		const object = unwrapExpression(member.object)
		const root =
			object.type === "MemberExpression" ?
				unwrapExpression(object.object)
			:	object
		const reference =
			root.type === "Identifier" ?
				module.scopes.referencesById.get(root)
			:	undefined
		const [exportName, read] =
			(reference && this.arkExportOf(reference, module)) ?? []
		return name === "errors" && exportName === "type" && read === object
	}

	isRuntimeUse(id: Node, module: SourceModule): boolean {
		for (
			let node = id;
			node.parent?.type === "MemberExpression" && node.parent.object === node;
			node = node.parent
		)
			if (this.isRuntimeMember(node.parent, module)) return true
		return false
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
			} else if (this.isRuntimeMember(node, module)) return false
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
		const fn = functionOfBinding(binding)
		return fn && staticBodyOf(fn) && !readsArguments(fn) ?
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
					isComposing(node) &&
					this.isArkBinding(binding, module) &&
					!this.isRuntimeUse(node, module)
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

// arktype runs through a reference called or read as `type(def)` or `T.array()`, but not one passed along as `{ type: T }`
const isComposing = (id: Node): boolean => {
	let node = id
	while (node.parent && isTransparent(node.parent)) node = node.parent
	const parent = node.parent
	return (
		(parent?.type === "MemberExpression" && parent.object === node) ||
		(parent?.type === "CallExpression" && parent.callee === node) ||
		(parent?.type === "TaggedTemplateExpression" && parent.tag === node)
	)
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

const functionOfBinding = (binding: Binding): FunctionNode | undefined => {
	if (binding.writes.length) return
	const fn =
		binding.kind === "function" ? binding.declaration
		: (
			binding.kind === "const" &&
			binding.declaration.type === "VariableDeclarator"
		) ?
			binding.declaration.init && unwrapExpression(binding.declaration.init)
		:	undefined
	return fn && isFunctionNode(fn) ? fn : undefined
}

// `arguments` aliases each argument, in parameter defaults too, so a parameter does not show where its argument goes
const readsArguments = (fn: FunctionNode): boolean => {
	if (fn.type === "ArrowFunctionExpression") return false
	let result = false
	for (const node of [...fn.params, fn.body!]) {
		walk(node, child => {
			if (child.type === "Identifier" && child.name === "arguments")
				result = true
			return (
				!result &&
				!(
					child.type === "FunctionExpression" ||
					child.type === "FunctionDeclaration"
				)
			)
		})
	}
	return result
}

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

// e.g. `id` in `(id: string) => type({ id: "string" }).pipe(o => o.id === id)`
export const readsBindingOf = (
	outer: Node,
	node: Node,
	module: SourceModule
): boolean => {
	let result = false
	walk(node, child => {
		const scope =
			child.type === "Identifier" ?
				module.scopes.referencesById.get(child)?.binding?.scope.node
			:	undefined
		if (scope && contains(outer, scope) && !contains(node, scope)) result = true
		return !result
	})
	return result
}
