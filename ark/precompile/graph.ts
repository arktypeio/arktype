import { Callable } from "@ark/util"
import * as arkregex from "arkregex"
import * as arktype from "arktype"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as arktypeConfig from "arktype/config"
import type { BaseRoot, GenericRoot } from "@ark/schema"
import type { Generic } from "arktype/internal/generic.ts"
import type { unavailableMember, Validator } from "arktype/internal/runtime.ts"
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
	normalize,
	operatorOf,
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
			| Extract<
					keyof BaseRoot,
					| "kind"
					| "inner"
					| "hasKind"
					| "assertHasKind"
					| "traverse"
					| "toString"
			  >,
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
		Record<
			| Exclude<keyof Generic, keyof Object>
			| Extract<keyof GenericRoot, "baseInstantiation">,
			1
		>
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

// what an expression may evaluate to, as flags joined where it may be either
export const kinds = {
	type: 1,
	// a Scope, Module, Generic or method, or what only the build can read off an arktype value
	otherArk: 2,
	// a value arktype didn't create
	data: 4,
	// a function whose call may return a Type
	returnsType: 8,
	// a function whose call may return any arktype value
	returnsArk: 16
} as const

export type ArkKind = number

const anyKind: ArkKind =
	kinds.type |
	kinds.otherArk |
	kinds.data |
	kinds.returnsType |
	kinds.returnsArk

const typeMethod: ArkKind = kinds.otherArk | kinds.returnsType

// the kind of each member of a Type a standalone validator lacks, so reading one outside a site throws at runtime
const typeMemberKinds: Record<string, ArkKind> = Object.setPrototypeOf(
	{
		in: kinds.type,
		out: kinds.type,
		and: typeMethod,
		or: typeMethod,
		intersect: anyKind,
		merge: typeMethod,
		pipe: typeMethod,
		to: typeMethod,
		narrow: typeMethod,
		filter: typeMethod,
		array: typeMethod,
		as: typeMethod,
		brand: typeMethod,
		configure: typeMethod,
		describe: typeMethod,
		onUndeclaredKey: typeMethod,
		onDeepUndeclaredKey: typeMethod,
		keyof: typeMethod,
		get: typeMethod,
		map: typeMethod,
		omit: typeMethod,
		pick: typeMethod,
		partial: typeMethod,
		required: typeMethod,
		readonly: typeMethod,
		extract: typeMethod,
		exclude: typeMethod,
		atLeastLength: typeMethod,
		atMostLength: typeMethod,
		moreThanLength: typeMethod,
		lessThanLength: typeMethod,
		exactlyLength: typeMethod,
		matching: typeMethod,
		atLeast: typeMethod,
		atMost: typeMethod,
		moreThan: typeMethod,
		lessThan: typeMethod,
		divisibleBy: typeMethod,
		atOrAfter: typeMethod,
		atOrBefore: typeMethod,
		laterThan: typeMethod,
		earlierThan: typeMethod,
		optional: anyKind,
		default: anyKind,
		ifEquals: anyKind,
		ifExtends: anyKind,
		equals: anyKind,
		extends: anyKind,
		overlaps: anyKind,
		distribute: anyKind,
		select: anyKind,
		props: anyKind,
		internal: anyKind,
		$: anyKind,
		precompilation: kinds.data
	} satisfies Record<unavailableMember, ArkKind>,
	null
)

const exportKindOf = (name: ArkExportName): ArkKind =>
	name in runtimeExports ? kinds.data
	: name === "type" ? kinds.otherArk | kinds.returnsType | kinds.returnsArk
	: kinds.otherArk | kinds.returnsArk

// e.g. a Type for `T.in`, a method returning one for `T.and`, or a string for `T.expression`, which leaves arktype
const memberKindOf = (object: ArkKind, name: unknown): ArkKind => {
	if (!isArk(object)) return object & kinds.data
	const kind =
		typeof name !== "string" ? anyKind
		: (
			name in validatorMembers ||
			name in runtimeMembers ||
			name in unstableArkMembers
		) ?
			kinds.data
		: object & kinds.otherArk ? anyKind
		: (typeMemberKinds[name] ?? anyKind)
	return kind | (object & kinds.data)
}

const callKindOf = (callee: ArkKind): ArkKind =>
	(callee & (kinds.type | kinds.data) ? kinds.data : 0) |
	(callee & kinds.returnsType ? kinds.type : 0) |
	(callee & kinds.returnsArk ? anyKind : 0)

export const isArk = (kind: ArkKind): boolean =>
	(kind & (kinds.type | kinds.otherArk)) !== 0

// a value that can only be a Type, so a standalone validator stands in for it wherever it is read
const isOnlyType = (kind: ArkKind): boolean =>
	(kind & (kinds.type | kinds.otherArk | kinds.data)) === kinds.type

// a function whose call composes or defines an arktype value, as `type` or `T.and` is
const isFactory = (kind: ArkKind): boolean =>
	isArk(kind) && (kind & (kinds.returnsType | kinds.returnsArk)) !== 0

type KindOfKey = (key: Binding | FunctionNode, module: SourceModule) => ArkKind

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
	private kindsByKey = new Map<Binding | FunctionNode, ArkKind>()
	private kindsByNode = new Map<Node, ArkKind>()
	private composingByFn = new Map<FunctionNode, boolean>()
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

	// the export a node reads, e.g. `type` for `type` or `ark.type`
	arkExportNameOf(node: Node, module: SourceModule): ArkExportName | undefined {
		node = normalize(node)
		const id = node.type === "MemberExpression" ? normalize(node.object) : node
		const reference =
			id.type === "Identifier" ?
				module.scopes.referencesById.get(id)
			:	undefined
		const [name, read] =
			(reference && this.arkExportOf(reference, module)) ?? []
		return read === node ? name : undefined
	}

	kindOf(node: Node, module: SourceModule): ArkKind {
		node = normalize(node)
		let result = this.kindsByNode.get(node)
		if (result === undefined) {
			result = this.transfer(node, module, this.finalKindOfKey)
			this.kindsByNode.set(node, result)
		}
		return result
	}

	private finalKindOfKey: KindOfKey = (key, module) =>
		this.kindsByKey.get(key) ?? this.solve(key, module)

	bindingKindOf(binding: Binding, module: SourceModule): ArkKind {
		return this.finalKindOfKey(binding, module)
	}

	// the least kinds a key and every key it reads can hold, iterated from none to stability, so none depends on which was asked first
	private solve(key: Binding | FunctionNode, module: SourceModule): ArkKind {
		const assumed = new Map<Binding | FunctionNode, [ArkKind, SourceModule]>([
			[key, [0, module]]
		])
		let isStable = false
		const kindOfKey: KindOfKey = (key, origin) => {
			const entry = this.kindsByKey.get(key) ?? assumed.get(key)?.[0]
			if (entry !== undefined) return entry
			assumed.set(key, [0, origin])
			isStable = false
			return 0
		}
		while (!isStable) {
			isStable = true
			for (const [key, entry] of assumed) {
				const kind = entry[0] | this.keyKindOf(key, entry[1], kindOfKey)
				if (kind === entry[0]) continue
				entry[0] = kind
				isStable = false
			}
		}
		for (const [key, [kind]] of assumed) this.kindsByKey.set(key, kind)
		return assumed.get(key)![0]
	}

	private keyKindOf(
		key: Binding | FunctionNode,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		if ("type" in key) return this.returnKindIn(key, module, kindOfKey)
		const binding = key
		if (binding.kind === "import")
			return this.targetKindOf(this.importOf(binding, module), kindOfKey)
		if (
			binding.kind !== "const" &&
			binding.kind !== "let" &&
			binding.kind !== "var"
		)
			return kinds.data
		const declaration = binding.declaration
		let result =
			declaration.type === "VariableDeclarator" && declaration.init ?
				this.patternKindOf(
					binding.id,
					declaration.id,
					this.transfer(declaration.init, module, kindOfKey),
					module,
					kindOfKey
				)
			:	kinds.data
		for (const write of binding.writes) {
			const parent = write.parent
			result |=
				(
					parent?.type === "AssignmentExpression" &&
					parent.operator === "=" &&
					parent.left === write
				) ?
					this.transfer(parent.right, module, kindOfKey)
				: parent?.type === "VariableDeclarator" && parent.init ?
					this.transfer(parent.init, module, kindOfKey)
				:	kinds.data
		}
		return result
	}

	// e.g. `M.User` for `User` in `const { User } = M`
	private patternKindOf(
		node: Node,
		pattern: Node,
		kind: ArkKind,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		if (node === pattern) return kind
		const parent = node.parent!
		switch (parent.type) {
			case "Property":
				return memberKindOf(
					this.patternKindOf(parent.parent!, pattern, kind, module, kindOfKey),
					keyNameOf(parent)
				)
			case "AssignmentPattern":
				return (
					this.patternKindOf(parent, pattern, kind, module, kindOfKey) |
					this.transfer(parent.right, module, kindOfKey)
				)
			default:
				return memberKindOf(
					this.patternKindOf(
						parent.type === "RestElement" ? parent.parent! : parent,
						pattern,
						kind,
						module,
						kindOfKey
					),
					undefined
				)
		}
	}

	private returnKindIn(
		fn: FunctionNode,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		if (fn.async || fn.generator || !fn.body) return kinds.data
		if (fn.body.type !== "BlockStatement")
			return this.transfer(fn.body, module, kindOfKey)
		const statements = fn.body.body
		// one that can end without a return statement returns undefined
		let result =
			statements[statements.length - 1]?.type === "ReturnStatement" ?
				0
			:	kinds.data
		walk(fn.body, node => {
			if (isFunctionNode(node)) return false
			if (node.type === "ReturnStatement") {
				result |=
					node.argument ?
						this.transfer(node.argument, module, kindOfKey)
					:	kinds.data
			}
			return true
		})
		return result
	}

	private targetKindOf(target: ImportTarget, kindOfKey: KindOfKey): ArkKind {
		switch (target.kind) {
			case "arktype":
				return exportKindOf(target.name)
			case "arktypeNamespace":
				return kinds.otherArk
			case "binding":
				return kindOfKey(target.binding, target.module)
			case "expression":
				return this.transfer(target.node, target.module, kindOfKey)
			default:
				return kinds.data
		}
	}

	private transfer(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		node = normalize(node)
		const cached = this.kindsByNode.get(node)
		if (cached !== undefined) return cached
		switch (node.type) {
			case "Identifier": {
				const binding = module.scopes.referencesById.get(node)?.binding
				return binding ? kindOfKey(binding, module) : kinds.data
			}
			case "MemberExpression": {
				const exported = this.namespaceMemberOf(node, module)
				if (exported) return this.targetKindOf(exported, kindOfKey)
				const property = this.propertyOf(node, module)
				if (property) return this.transfer(...property, kindOfKey)
				const name = memberNameOf(node)
				// the class of what a Type returns when validation fails
				if (
					name === "errors" &&
					this.arkExportNameOf(node.object, module) === "type"
				)
					return kinds.data
				return memberKindOf(this.transfer(node.object, module, kindOfKey), name)
			}
			case "CallExpression":
			case "TaggedTemplateExpression": {
				const callee = normalize(
					node.type === "CallExpression" ? node.callee : node.tag
				)
				// e.g. `type({ a: "string" })`, where only a definition with parameters could make a Generic
				if (
					node.type === "CallExpression" &&
					node.arguments.length === 1 &&
					node.arguments[0].type !== "SpreadElement" &&
					this.arkExportNameOf(callee, module) === "type"
				)
					return kinds.type
				const fn = this.functionOf(callee, module)
				return fn ?
						kindOfKey(...fn)
					:	callKindOf(this.transfer(callee, module, kindOfKey))
			}
			case "ConditionalExpression":
				return (
					this.transfer(node.consequent, module, kindOfKey) |
					this.transfer(node.alternate, module, kindOfKey)
				)
			case "LogicalExpression":
				return (
					this.transfer(node.left, module, kindOfKey) |
					this.transfer(node.right, module, kindOfKey)
				)
			case "SequenceExpression":
				return this.transfer(
					node.expressions[node.expressions.length - 1],
					module,
					kindOfKey
				)
			case "AssignmentExpression":
				return node.operator === "=" ?
						this.transfer(node.right, module, kindOfKey)
					:	kinds.data
			default:
				return kinds.data
		}
	}

	// e.g. `type({ name: "string" })` for `schemas.User` with `const schemas = { User: type({ name: "string" }) }`, or a class's static property
	private propertyOf(
		member: MemberExpression,
		module: SourceModule
	): [value: Node, module: SourceModule] | undefined {
		const name = memberNameOf(member)
		let object = normalize(member.object)
		const binding =
			object.type === "Identifier" ?
				module.scopes.referencesById.get(object)?.binding
			:	undefined
		if (binding) {
			const declaration = binding.declaration
			if (binding.writes.length) return
			if (binding.kind === "class") object = declaration
			else if (
				binding.kind === "const" &&
				declaration.type === "VariableDeclarator" &&
				declaration.id === binding.id &&
				declaration.init
			)
				object = normalize(declaration.init)
			else return
		}
		const properties =
			object.type === "ObjectExpression" ? object.properties
			: (
				object.type === "ClassDeclaration" || object.type === "ClassExpression"
			) ?
				object.body.body.filter(
					element => "static" in element && element.static
				)
			:	undefined
		if (!properties || typeof name !== "string") return
		let result: Node | null | undefined
		for (const property of properties) {
			// a later spread or computed key can replace any earlier property
			if (!("key" in property) || keyNameOf(property) === undefined)
				result = undefined
			else if (keyNameOf(property) === name) {
				result =
					(
						property.type === "PropertyDefinition" ||
						(property.type === "Property" && property.kind === "init")
					) ?
						property.value
					:	undefined
			}
		}
		return result ? [result, module] : undefined
	}

	// e.g. `schemas.User` with `schemas` a namespace import
	private namespaceMemberOf(
		member: MemberExpression,
		module: SourceModule
	): ImportTarget | undefined {
		const object = normalize(member.object)
		const name = memberNameOf(member)
		const binding =
			object.type === "Identifier" ?
				module.scopes.referencesById.get(object)?.binding
			:	undefined
		if (binding?.kind !== "import" || typeof name !== "string") return
		const target = this.importOf(binding, module)
		return (
			target.kind === "namespace" ? this.exportOf(target.module, name)
			: target.kind === "arktypeNamespace" ? arktypeExportOf(target, name)
			: undefined
		)
	}

	// the operator that needs arktype to run on an arktype value, as `.and` or a call to `type` does
	composerOf(node: Node, module: SourceModule): Node | undefined {
		const [operand, operator] = operatorOf(node)
		const kind = this.kindOf(node, module)
		return (
				operator?.type === "MemberExpression" ?
					operator.object === operand &&
					isArk(kind) &&
					isArk(this.kindOf(operator, module))
				: operator?.type === "CallExpression" ?
					operator.callee === operand && isFactory(kind)
				: operator?.type === "TaggedTemplateExpression" ?
					operator.tag === operand && isFactory(kind)
				:	false
			) ?
				operator
			:	undefined
	}

	// e.g. `and` and `T` for `T.and`, or `in` and `T` for `const { in: I } = T`, with `T` only ever a Type, which a standalone validator replaces without the member
	unavailableReadOf(
		node: Node,
		module: SourceModule
	): [name: string, object: Node] | undefined {
		let name: unknown
		let object: Node | undefined
		let kind: ArkKind = 0
		if (node.type === "MemberExpression") {
			name = memberNameOf(node)
			object = node.object
			kind = this.kindOf(object, module)
		} else if (
			node.type === "Property" &&
			node.parent?.type === "ObjectPattern"
		) {
			name = keyNameOf(node)
			let root: Node = node.parent
			while (root.parent && isPatternPart(root.parent)) root = root.parent
			const parent = root.parent
			object =
				parent?.type === "VariableDeclarator" && parent.id === root ?
					(parent.init ?? undefined)
				: parent?.type === "AssignmentExpression" && parent.left === root ?
					parent.right
				:	undefined
			if (object) {
				kind = this.patternKindOf(
					node.parent,
					root,
					this.kindOf(object, module),
					module,
					this.finalKindOfKey
				)
			}
		}
		return (
				typeof name === "string" &&
					name in typeMemberKinds &&
					object &&
					isOnlyType(kind)
			) ?
				[name, object]
			:	undefined
	}

	// e.g. `T.assert` in `T.assert(x)` or `type.errors`, which run at runtime in every mode
	leavesArk(node: Node, module: SourceModule): boolean {
		for (;;) {
			const [operand, operator] = operatorOf(node)
			if (operator?.type !== "MemberExpression" || operator.object !== operand)
				return false
			if (!isArk(this.kindOf(operator, module))) return true
			node = operator
		}
	}

	private functionOf(
		callee: Node,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		callee = normalize(callee)
		if (isFunctionNode(callee)) return [callee, module]
		if (callee.type === "Identifier") {
			const binding = module.scopes.referencesById.get(callee)?.binding
			return binding && this.boundFunctionOf(binding, module)
		}
		if (callee.type !== "MemberExpression") return
		const target = this.namespaceMemberOf(callee, module)
		return target?.kind === "binding" ?
				this.boundFunctionOf(target.binding, target.module)
			:	undefined
	}

	private boundFunctionOf(
		binding: Binding,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		if (binding.kind === "import") {
			const target = this.importOf(binding, module)
			if (target.kind === "binding")
				return this.boundFunctionOf(target.binding, target.module)
			// e.g. `export default () => A`
			const fn = target.kind === "expression" && normalize(target.node)
			return fn && isFunctionNode(fn) ? [fn, target.module] : undefined
		}
		const fn = functionOfBinding(binding)
		return fn && [fn, module]
	}

	// a function whose single expression a site can fold into each call
	helperOf(
		callee: Node,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		if (isFunctionNode(normalize(callee))) return
		const helper = this.functionOf(callee, module)
		return helper && isStatic(helper[0]) ? helper : undefined
	}

	// a binding or exported expression holding an arktype value, or a function whose call returns one or, as a static helper, composes one
	definesArk(
		target: Extract<ImportTarget, { kind: "binding" | "expression" }>
	): boolean {
		const { module } = target
		let fn: readonly [FunctionNode, SourceModule] | undefined
		if (target.kind === "binding") {
			if (isArk(this.bindingKindOf(target.binding, module))) return true
			fn = this.boundFunctionOf(target.binding, module)
		} else {
			const node = normalize(target.node)
			if (isArk(this.kindOf(node, module))) return true
			if (isFunctionNode(node)) fn = [node, module]
		}
		return (
			!!fn &&
			(isArk(this.finalKindOfKey(...fn)) ||
				(isStatic(fn[0]) && this.composesArk(...fn)))
		)
	}

	// a static helper whose body composes an arktype value, so each call to it is a site
	composesArk(fn: FunctionNode, module: SourceModule): boolean {
		let result = this.composingByFn.get(fn)
		if (result !== undefined) return result
		result = false
		walk(staticBodyOf(fn)!, node => {
			if (result || isFunctionNode(node)) return false
			// e.g. not `T.internal` in `T.internal.precompilation`, which only reads a member that leaves arktype
			result =
				!isTransparent(node) &&
				node.type !== "ChainExpression" &&
				!!this.composerOf(node, module) &&
				!this.leavesArk(node, module)
			return !result
		})
		this.composingByFn.set(fn, result)
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

// e.g. `a` for `{ a: x }`, `{ "a": x }` or `{ ["a"]: x }`
const keyNameOf = (property: { key: Node; computed: boolean }): unknown =>
	property.key.type === "Literal" ? property.key.value
	: property.computed || property.key.type !== "Identifier" ? undefined
	: property.key.name

const isPatternPart = (node: Node): boolean =>
	node.type === "ObjectPattern" ||
	node.type === "ArrayPattern" ||
	node.type === "Property" ||
	node.type === "AssignmentPattern" ||
	node.type === "RestElement"

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

const isStatic = (fn: FunctionNode): boolean =>
	!!staticBodyOf(fn) && !readsArguments(fn)

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
