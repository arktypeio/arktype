import { Callable } from "@ark/util"
import * as arkregex from "arkregex"
import * as arktype from "arktype"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as arktypeConfig from "arktype/config"
import type { BaseRoot, GenericRoot } from "@ark/schema"
import type { Generic } from "arktype/internal/generic.ts"
import type { Validator } from "arktype/internal/runtime.ts"
import type { Scope } from "arktype/internal/scope.ts"
import type { ArrayType } from "arktype/internal/variants/array.ts"
import type { BaseType } from "arktype/internal/variants/base.ts"
import type { DateType } from "arktype/internal/variants/date.ts"
import type { NumberType } from "arktype/internal/variants/number.ts"
import type { ObjectType } from "arktype/internal/variants/object.ts"
import type { StringType } from "arktype/internal/variants/string.ts"
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

// a node's members its content alone decides: the documented Type API less what prints registry names or node ids, and the node API `.internal` documents
export const nodeMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		internal: 1,
		expression: 1,
		description: 1,
		meta: 1,
		assert: 1,
		allows: 1,
		from: 1,
		traverse: 1,
		"~standard": 1,
		t: 1,
		infer: 1,
		inferIn: 1,
		inferOut: 1,
		inferIntrospectableOut: 1,
		toJsonSchema: 1,
		configure: 1,
		describe: 1,
		onUndeclaredKey: 1,
		onDeepUndeclaredKey: 1,
		in: 1,
		out: 1,
		brand: 1,
		array: 1,
		optional: 1,
		default: 1,
		filter: 1,
		narrow: 1,
		pipe: 1,
		to: 1,
		select: 1,
		as: 1,
		and: 1,
		or: 1,
		intersect: 1,
		equals: 1,
		ifEquals: 1,
		extends: 1,
		ifExtends: 1,
		overlaps: 1,
		extract: 1,
		exclude: 1,
		distribute: 1,
		atLeastLength: 1,
		atMostLength: 1,
		moreThanLength: 1,
		lessThanLength: 1,
		exactlyLength: 1,
		matching: 1,
		atLeast: 1,
		atMost: 1,
		moreThan: 1,
		lessThan: 1,
		divisibleBy: 1,
		atOrAfter: 1,
		atOrBefore: 1,
		laterThan: 1,
		earlierThan: 1,
		get: 1,
		keyof: 1,
		map: 1,
		merge: 1,
		omit: 1,
		partial: 1,
		pick: 1,
		props: 1,
		readonly: 1,
		required: 1,
		kind: 1,
		inner: 1,
		hasKind: 1,
		assertHasKind: 1,
		toString: 1
	} satisfies Partial<
		Record<
			| keyof BaseType
			| keyof StringType
			| keyof NumberType
			| keyof DateType
			| keyof ArrayType<unknown[]>
			| keyof ObjectType
			| keyof BaseRoot,
			1
		>
	>,
	null
)

// a Scope's members its definitions alone decide, unlike its counted `name` or its `references`
export const scopeMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		t: 1,
		config: 1,
		exportedNames: 1,
		aliases: 1,
		internal: 1,
		defineSchema: 1,
		node: 1,
		unit: 1,
		enumerated: 1,
		valueOf: 1,
		instanceOf: 1,
		type: 1,
		match: 1,
		fn: 1,
		declare: 1,
		define: 1,
		generic: 1,
		schema: 1,
		import: 1,
		export: 1,
		resolve: 1
	} satisfies Partial<Record<keyof Scope, 1>>,
	null
)

// a Generic's members its definition alone decides
export const genericMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		t: 1,
		bodyDef: 1,
		params: 1,
		names: 1,
		constraints: 1,
		$: 1,
		arg$: 1,
		internal: 1,
		baseInstantiation: 1
	} satisfies Partial<
		Record<Exclude<keyof Generic | keyof GenericRoot, keyof Object>, 1>
	>,
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
	private arkReturns = new Map<FunctionNode, boolean>()
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
		const name = memberNameOf(member)
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
				if (
					helper &&
					(this.isArkHelper(helper[0], helper[1]) ||
						this.returnsArk(helper[0], helper[1]))
				)
					return true
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

	// e.g. `first = () => M1`, whose body composes nothing but whose call is a Type
	returnsArk(fn: FunctionNode, module: SourceModule): boolean {
		const cached = this.arkReturns.get(fn)
		if (cached !== undefined) return cached
		// e.g. `f = () => f().and(x)`, which reads itself as returning no Type while it's decided
		this.arkReturns.set(fn, false)
		const result = this.isArkExpression(staticBodyOf(fn)!, module)
		this.arkReturns.set(fn, result)
		return result
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

export const memberNameOf = (member: MemberExpression): unknown =>
	member.computed ?
		member.property.type === "Literal" ?
			member.property.value
		:	undefined
	:	member.property.name

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
