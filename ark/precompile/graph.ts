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
	CallExpression,
	ClassElement,
	Function,
	ImportSpecifier,
	MemberExpression,
	NewExpression,
	Node,
	ObjectPropertyKind
} from "oxc-parser"
import { dirname, join, relative } from "node:path"
import { isArkValue } from "./builtins.ts"
import { dependencyOf, optsIn, type PrecompileHost } from "./host.ts"
import { SourceModule } from "./module.ts"
import {
	exportNameOf,
	isTransparent,
	normalize,
	operatorOf,
	runtimeParamsOf,
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
		ArkErrors: 1,
		byAncestorPath: 1,
		byPath: 1,
		flatByPath: 1,
		flatProblemsByPath: 1,
		messageIn: 1,
		ParseError: 1,
		Traversal: 1,
		TraversalError: 1
	} satisfies { [name in ArkExportName]?: 1 },
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

// e.g. `assert` or `toString`, which end a site at a Type, as a standalone validator serves them
export const isValidatorMember = (name: unknown): boolean =>
	typeof name === "string" &&
	(name in validatorMembers || name in Function.prototype)

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
			Exclude<
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
				UnstableArkMember
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
			| Exclude<keyof Generic, keyof Object | UnstableArkMember>
			| Extract<keyof GenericRoot, "baseInstantiation">,
			1
		>
	>,
	null
)

// what counts nodes or names registry entries, so differs between a build and the program it builds
export const unstableArkMembers = {
	__proto__: null,
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
}

type UnstableArkMember = keyof typeof unstableArkMembers

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

// the kind of each member of a Type a standalone validator lacks
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
		// the Type's node, never a Module, so a member of a Type's data is data off it too
		internal: kinds.type | kinds.data,
		$: anyKind,
		precompilation: kinds.data
	} satisfies Record<unavailableMember, ArkKind>,
	null
)

const exportKindOf = (name: ArkExportName): ArkKind =>
	name in runtimeExports ? kinds.data
	: name === "type" ? kinds.otherArk | kinds.returnsType | kinds.returnsArk
	: kinds.otherArk | kinds.returnsArk

// e.g. a Type for `T.in`, a method returning one for `T.and`, or a string for `T.expression` or `T.toString()`, which leave arktype
const memberKindOf = (objectKind: ArkKind, name: unknown): ArkKind => {
	if (!isArk(objectKind)) return objectKind & kinds.data
	const kind =
		// a Module's member is whatever its alias is, whatever its name, so a Type's ends its site only once the build has its value
		typeof name !== "string" || objectKind & kinds.otherArk ? anyKind
		: (
			isValidatorMember(name) ||
			name in runtimeMembers ||
			name in unstableArkMembers ||
			name === "toJsonSchema"
		) ?
			kinds.data
		:	(typeMemberKinds[name] ?? anyKind)
	return kind | (objectKind & kinds.data)
}

const callKindOf = (callee: ArkKind): ArkKind =>
	(callee & (kinds.type | kinds.data) ? kinds.data : 0) |
	(callee & kinds.returnsType ? kinds.type : 0) |
	(callee & kinds.returnsArk ? anyKind : 0)

const functionKindOf = (returned: ArkKind): ArkKind =>
	kinds.data |
	(returned & kinds.type ? kinds.returnsType : 0) |
	(returned & (anyKind & ~kinds.type & ~kinds.data) ? kinds.returnsArk : 0)

export const isArk = (kind: ArkKind): boolean =>
	(kind & (kinds.type | kinds.otherArk)) !== 0

export const isOnlyType = (kind: ArkKind): boolean =>
	(kind & (kinds.type | kinds.otherArk | kinds.data)) === kinds.type

const isFactory = (kind: ArkKind): boolean =>
	(kind & (kinds.returnsType | kinds.returnsArk)) !== 0

interface Application {
	fn: FunctionNode
	args: readonly ArkKind[]
}

type Key = Binding | FunctionNode | Application

type KindOfKey = (key: Key, module: SourceModule) => ArkKind

// e.g. `{ t }` from `wrap(A)` with `wrap = t => ({ t })`, whose `t` is read as the call passes it
interface Located {
	node: Node
	module: SourceModule
	kindOfKey: KindOfKey
}

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
	private kindsByKey = new Map<Key, ArkKind>()
	private kindsByNode = new Map<Node, ArkKind>()
	// a helper's parameters as one call passes them, which the kinds cached by node can't hold
	private bindingKindOfKeys = new WeakSet<KindOfKey>()
	private applicationsByFn = new Map<FunctionNode, Map<string, Application>>()
	private resolving = new Set<Node>()
	private heldKindsByNode = new Map<Node, ArkKind>()
	private composingByFn = new Map<FunctionNode, boolean>()
	private importsById: Record<string, string[]> = Object.create(null)
	private optsInByPackage: Record<string, boolean> = Object.create(null)
	private packageNamesByDir: Record<string, string | undefined> =
		Object.create(null)

	constructor(host: PrecompileHost, cwd?: string) {
		this.host = host
		this.cwd = cwd
	}

	pathOf(id: string): string {
		return this.cwd === undefined ? id : relative(this.cwd, id)
	}

	add(id: string, source: string): SourceModule {
		const existing = this.modulesById[id]
		// a program evaluates a module once, so one given again as the graph holds it is that module
		if (existing instanceof SourceModule && existing.source === source)
			return existing
		if (existing) this.dropImportersOf(id)
		const module = new SourceModule(id, source, this.pathOf(id))
		this.modulesById[id] = module
		return module
	}

	// each importer was evaluated against the previous version, so it's evaluated again
	private dropImportersOf(id: string): void {
		const dropped = [id]
		for (let i = 0; i < dropped.length; i++) {
			for (const importer in this.importsById) {
				if (
					this.importsById[importer].includes(dropped[i]) &&
					!dropped.includes(importer)
				)
					dropped.push(importer)
			}
		}
		for (const droppedId of dropped) {
			delete this.importsById[droppedId]
			const module = this.modulesById[droppedId]
			if (droppedId !== id && module instanceof SourceModule) {
				this.modulesById[droppedId] = new SourceModule(
					droppedId,
					module.source,
					module.path
				)
			}
		}
	}

	// each module the module's imports and re-exports run before it does
	loadedBy(module: SourceModule): SourceModule[] {
		const result: SourceModule[] = []
		for (const statement of module.program.body) {
			const source =
				statement.type === "ImportDeclaration" ? statement.source.value
				: (
					statement.type === "ExportNamedDeclaration" ||
					statement.type === "ExportAllDeclaration"
				) ?
					statement.source?.value
				:	undefined
			const loaded =
				source === undefined ? undefined : this.resolve(source, module)
			if (loaded instanceof SourceModule && !result.includes(loaded))
				result.push(loaded)
		}
		return result
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

	// the name in the package.json nearest a module, e.g. `arksets` for one a workspace links from its source
	packageNameOf(id: string): string | undefined {
		const dir = dirname(id)
		if (dir in this.packageNamesByDir) return this.packageNamesByDir[dir]
		const manifest = this.host.readFile(join(dir, "package.json"))
		return (this.packageNamesByDir[dir] =
			manifest !== undefined ? JSON.parse(manifest).name
			: dir === dirname(dir) ? undefined
			: this.packageNameOf(dir))
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

	// iterated from none, re-deciding a key only when one it read grew, so the result is least and doesn't depend on which was asked first
	private solve(key: Key, module: SourceModule): ArkKind {
		const assumed = new Map<Key, [ArkKind, SourceModule]>([[key, [0, module]]])
		const readersByKey = new Map<Key, Set<Key>>()
		const pending: Key[] = [key]
		let reader = key
		const kindOfKey: KindOfKey = (read, origin) => {
			const final = this.kindsByKey.get(read)
			if (final !== undefined) return final
			let entry = assumed.get(read)
			if (!entry) {
				assumed.set(read, (entry = [0, origin]))
				pending.push(read)
			}
			let readers = readersByKey.get(read)
			if (!readers) readersByKey.set(read, (readers = new Set()))
			readers.add(reader)
			return entry[0]
		}
		while (pending.length) {
			reader = pending.pop()!
			const entry = assumed.get(reader)!
			const kind = entry[0] | this.keyKindOf(reader, entry[1], kindOfKey)
			if (kind === entry[0]) continue
			entry[0] = kind
			pending.push(...(readersByKey.get(reader) ?? []))
		}
		for (const [key, [kind]] of assumed) this.kindsByKey.set(key, kind)
		return assumed.get(key)![0]
	}

	private keyKindOf(
		key: Key,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		if ("args" in key) {
			return this.transfer(
				staticBodyOf(key.fn)!,
				module,
				this.appliedKindOfKey(key, module, kindOfKey)
			)
		}
		if ("type" in key) return this.returnKindIn(key, module, kindOfKey)
		const binding = key
		switch (binding.kind) {
			case "import":
				return this.targetKindOf(this.importOf(binding, module), kindOfKey)
			case "param":
				return this.paramKindOf(binding, module, kindOfKey)
			case "function":
				return functionKindOf(
					kindOfKey(binding.declaration as FunctionNode, module)
				)
			case "const":
			case "let":
			case "var":
				break
			default:
				return kinds.data
		}
		const declaration = binding.declaration
		let result =
			declaration.type !== "VariableDeclarator" ? kinds.data
			: declaration.init ?
				this.patternKindOf(
					binding.id,
					declaration.id,
					this.transfer(declaration.init, module, kindOfKey),
					module,
					kindOfKey
				)
			:	this.iteratedKindOf(declaration, binding, module, kindOfKey)
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

	// e.g. `A | B` for `t` in `for (const t of [A, B])`
	private iteratedKindOf(
		declarator: Node,
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		const loop = declarator.parent?.parent
		if (
			loop?.type !== "ForOfStatement" ||
			loop.left !== declarator.parent ||
			declarator.type !== "VariableDeclarator"
		)
			return kinds.data
		const iterated = this.literalOf(loop.right, module, kindOfKey)
		const element =
			iterated?.node.type === "ArrayExpression" ?
				this.heldKindOf(iterated)
			:	memberKindOf(this.transfer(loop.right, module, kindOfKey), undefined)
		return this.patternKindOf(
			binding.id,
			declarator.id,
			element,
			module,
			kindOfKey
		)
	}

	// e.g. `A | B` for `t` given `f(A)` and `f(B)`, or any value if `f` is exported or passed
	private paramKindOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): ArkKind {
		const fn = binding.declaration as FunctionNode
		const params = runtimeParamsOf(fn)
		const index = params.findIndex(param => contains(param, binding.id))
		const calls = this.callsOf(fn, module)
		if (index === -1 || params[index].type === "RestElement" || !calls)
			return kinds.data
		let result = 0
		for (const call of calls) {
			const args = call.arguments
			const spread = args.findIndex(arg => arg.type === "SpreadElement")
			const arg = args[index]
			result |= this.patternKindOf(
				binding.id,
				params[index],
				spread !== -1 && spread <= index ? kinds.data
				: arg ? this.transfer(arg, module, kindOfKey)
				: kinds.data,
				module,
				kindOfKey
			)
		}
		return result
	}

	// e.g. `f(A)` or `(t => t)(A)`, or undefined if `f` is exported or passed where the build can't see its calls
	callsOf(
		fn: FunctionNode,
		module: SourceModule
	): (CallExpression | NewExpression)[] | undefined {
		const binding = bindingOfFunction(fn, module)
		if (binding && (binding.exportNames.length || binding.writes.length)) return
		const result: (CallExpression | NewExpression)[] = []
		for (const id of binding ? binding.references.map(r => r.id) : [fn]) {
			if (isNamed(id, module)) continue
			const [operand, operator] = operatorOf(id)
			if (
				(operator?.type !== "CallExpression" &&
					operator?.type !== "NewExpression") ||
				operator.callee !== operand
			)
				return
			result.push(operator)
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
						parent.type === "RestElement" && parent !== pattern ?
							parent.parent!
						:	parent,
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
		const cached =
			this.bindingKindOfKeys.has(kindOfKey) ?
				undefined
			:	this.kindsByNode.get(node)
		if (cached !== undefined) return cached
		switch (node.type) {
			case "Identifier": {
				const binding = module.scopes.referencesById.get(node)?.binding
				return binding ? kindOfKey(binding, module) : kinds.data
			}
			case "ArrowFunctionExpression":
			case "FunctionExpression":
				return functionKindOf(kindOfKey(node, module))
			case "MemberExpression": {
				const exported = this.namespaceMemberOf(node, module)
				if (exported) return this.targetKindOf(exported, kindOfKey)
				const name = memberNameOf(node)
				const literal = this.literalOf(node.object, module, kindOfKey)
				if (literal) {
					// e.g. `o.a` in `const o = { a: o.a }`, which holds nothing until it holds something else
					if (this.resolving.has(node)) return 0
					this.resolving.add(node)
					try {
						const value = this.valueIn(literal, name)
						return (
							value === null ? kinds.data
							: value ? this.transfer(value.node, value.module, value.kindOfKey)
							: kinds.data | this.heldKindOf(literal)
						)
					} finally {
						this.resolving.delete(node)
					}
				}
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
				const fn =
					this.functionOf(callee, module) ??
					this.methodOf(callee, module, kindOfKey)
				if (!fn) return callKindOf(this.transfer(callee, module, kindOfKey))
				if (
					node.type !== "CallExpression" ||
					!isStatic(fn[0]) ||
					!runtimeParamsOf(fn[0]).length
				)
					return kindOfKey(...fn)
				// e.g. a Type for `withId(A)` with `withId = t => t.and({ id: "string" })`, though a call passing a string returns a string
				return kindOfKey(
					this.applicationOf(node, fn[0], module, kindOfKey),
					fn[1]
				)
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

	private applicationOf(
		call: CallExpression,
		fn: FunctionNode,
		module: SourceModule,
		kindOfKey: KindOfKey
	): Application {
		const spread = call.arguments.findIndex(arg => arg.type === "SpreadElement")
		const args = runtimeParamsOf(fn).map((param, i) =>
			param.type === "RestElement" || (spread !== -1 && spread <= i) ?
				kinds.data
			: call.arguments[i] ? this.transfer(call.arguments[i], module, kindOfKey)
			: kinds.data
		)
		let applications = this.applicationsByFn.get(fn)
		if (!applications) this.applicationsByFn.set(fn, (applications = new Map()))
		const id = args.join()
		let result = applications.get(id)
		if (!result) applications.set(id, (result = { fn, args }))
		return result
	}

	private appliedKindOfKey(
		{ fn, args }: Application,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindOfKey {
		const params = runtimeParamsOf(fn)
		const result: KindOfKey = (key, keyModule) => {
			if (!("kind" in key) || key.kind !== "param" || key.declaration !== fn)
				return kindOfKey(key, keyModule)
			const index = params.findIndex(param => contains(param, key.id))
			return index === -1 ?
					kinds.data
				:	this.patternKindOf(key.id, params[index], args[index], module, result)
		}
		this.bindingKindOfKeys.add(result)
		return result
	}

	// e.g. `{ User: type(...) }` for `schemas`, `make()` or `forms.create`, read through bindings, imports, members and static helpers
	private literalOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		seen = new Set<Node>()
	): Located | undefined {
		node = normalize(node)
		if (seen.has(node)) return
		seen.add(node)
		switch (node.type) {
			case "ObjectExpression":
			case "ArrayExpression":
			case "ClassExpression":
				return { node, module, kindOfKey }
			case "Identifier": {
				const binding = module.scopes.referencesById.get(node)?.binding
				return (
					binding && this.bindingLiteralOf(binding, module, kindOfKey, seen)
				)
			}
			case "MemberExpression": {
				const exported = this.namespaceMemberOf(node, module)
				if (exported) return this.targetLiteralOf(exported, kindOfKey, seen)
				const object = this.literalOf(node.object, module, kindOfKey, seen)
				const value = object && this.valueIn(object, memberNameOf(node), seen)
				return value ?
						this.literalOf(value.node, value.module, value.kindOfKey, seen)
					:	undefined
			}
			case "CallExpression": {
				const fn = this.functionOf(node.callee, module)
				const body = fn && returnedOf(fn[0])
				return body ?
						this.literalOf(
							body,
							fn[1],
							this.appliedKindOfKey(
								this.applicationOf(node, fn[0], module, kindOfKey),
								fn[1],
								kindOfKey
							),
							seen
						)
					:	undefined
			}
		}
	}

	private bindingLiteralOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey,
		seen: Set<Node>
	): Located | undefined {
		if (binding.kind === "import") {
			return this.targetLiteralOf(
				this.importOf(binding, module),
				kindOfKey,
				seen
			)
		}
		const declaration = binding.declaration
		if (binding.writes.length) return
		if (binding.kind === "class")
			return { node: declaration, module, kindOfKey }
		return (
				binding.kind === "const" &&
					declaration.type === "VariableDeclarator" &&
					declaration.id === binding.id &&
					declaration.init
			) ?
				this.literalOf(declaration.init, module, kindOfKey, seen)
			:	undefined
	}

	private targetLiteralOf(
		target: ImportTarget,
		kindOfKey: KindOfKey,
		seen: Set<Node>
	): Located | undefined {
		return (
			target.kind === "binding" ?
				this.bindingLiteralOf(target.binding, target.module, kindOfKey, seen)
			: target.kind === "expression" ?
				this.literalOf(target.node, target.module, kindOfKey, seen)
			:	undefined
		)
	}

	// the value a literal holds at a key, null if it holds none, or undefined if a spread, computed key or accessor can decide it
	private valueIn(
		literal: Located,
		name: unknown,
		seen = new Set<Node>()
	): Located | null | undefined {
		const { node } = literal
		if (node.type === "ArrayExpression") {
			const index =
				typeof name === "number" ? name
				: typeof name === "string" && /^(?:0|[1-9]\d*)$/.test(name) ?
					Number(name)
				:	undefined
			// e.g. `length` or `map`, which no element can replace
			if (index === undefined) return null
			const elements = node.elements.slice(0, index + 1)
			if (elements.some(element => element?.type === "SpreadElement")) return
			const element = node.elements[index]
			return element ? { ...literal, node: element } : null
		}
		const properties = membersOf(node)
		const key = name === undefined ? undefined : String(name)
		for (let i = properties.length - 1; i >= 0; i--) {
			const property = properties[i]
			if (property.type === "SpreadElement") {
				const spread = this.literalOf(
					property.argument,
					literal.module,
					literal.kindOfKey,
					seen
				)
				const value = spread && this.valueIn(spread, name, seen)
				if (value !== null) return value
				continue
			}
			if (!("key" in property)) continue
			const propertyKey = keyNameOf(property)
			if (propertyKey === undefined || key === undefined) return
			if (String(propertyKey) !== key) continue
			const value = memberValueOf(property)
			if (accessorKindOf(property) === "get") {
				const returned = onlyReturnOf(value as FunctionNode)
				return returned && { ...literal, node: returned }
			}
			if (accessorKindOf(property) === "set") return
			return value ? { ...literal, node: value } : null
		}
		if (
			(node.type === "ClassDeclaration" || node.type === "ClassExpression") &&
			node.superClass
		) {
			const parent = this.literalOf(
				node.superClass,
				literal.module,
				literal.kindOfKey,
				seen
			)
			return parent && this.valueIn(parent, name, seen)
		}
		return null
	}

	// e.g. what `schemas[key]` or `schemas[key].User` may read
	private heldKindOf(literal: Located, seen = new Set<Node>()): ArkKind {
		const { node, module, kindOfKey } = literal
		const isCached = !seen.size && kindOfKey === this.finalKindOfKey
		let result = isCached ? this.heldKindsByNode.get(node) : undefined
		if (result !== undefined) return result
		result = 0
		if (seen.has(node)) return result
		seen.add(node)
		for (const member of node.type === "ArrayExpression" ?
			node.elements
		:	membersOf(node)) {
			if (!member || accessorKindOf(member) === "set") continue
			const value = memberValueOf(member)
			if (!value) continue
			if (accessorKindOf(member) === "get") {
				result |= kindOfKey(value as FunctionNode, module)
				continue
			}
			const held = value.type === "SpreadElement" ? value.argument : value
			const nested = this.literalOf(held, module, kindOfKey)
			result |=
				nested ? kinds.data | this.heldKindOf(nested, seen)
				: held === value ? this.transfer(value, module, kindOfKey)
				: memberKindOf(this.transfer(held, module, kindOfKey), undefined)
		}
		if (isCached) this.heldKindsByNode.set(node, result)
		return result
	}

	// e.g. `schemas.User` with `schemas` a namespace import
	namespaceMemberOf(
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

	// e.g. `T.and` for `T`, or `type(def)` for `type`
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

	// e.g. `json` and `T` for `T.json` or `const { json } = T`, or `T` alone for `T[key]`, where `T` can only be a Type
	unavailableReadOf(
		node: Node,
		module: SourceModule
	): [read: string | undefined, object: Node] | undefined {
		let read: unknown
		let objects: Node[] = []
		let kindOf = (object: Node) => this.kindOf(object, module)
		if (node.type === "MemberExpression") {
			read = memberNameOf(node)
			objects = [node.object]
		} else if (
			(node.type === "Property" || node.type === "RestElement") &&
			node.parent?.type === "ObjectPattern"
		) {
			if (node.type === "Property") read = keyNameOf(node)
			const pattern = node.parent
			let root: Node = pattern
			while (root.parent && isPatternPart(root.parent)) root = root.parent
			const parent = root.parent
			const source =
				parent?.type === "VariableDeclarator" && parent.id === root ?
					parent.init
				: parent?.type === "AssignmentExpression" && parent.left === root ?
					parent.right
				: root.type === "AssignmentPattern" ? root.right
				: undefined
			if (source) {
				objects = [source]
				kindOf = source =>
					this.patternKindOf(
						pattern,
						root,
						this.kindOf(source, module),
						module,
						this.finalKindOfKey
					)
			}
		} else [read, objects] = this.reflectionOf(node, module) ?? [undefined, []]
		const object = objects.find(object => isOnlyType(kindOf(object)))
		return (
				object &&
					(read === undefined ||
						(typeof read === "string" && !isValidatorMember(read)))
			) ?
				[read, object]
			:	undefined
	}

	// e.g. `toJSON` and `T` for `JSON.stringify(T)`, or `T` alone for `Object.keys(T)`, `{ ...T }` or `for (k in T)`, which reflect on all of it
	private reflectionOf(
		node: Node,
		module: SourceModule
	): [read: unknown, objects: Node[]] | undefined {
		if (
			node.type === "SpreadElement" &&
			node.parent?.type === "ObjectExpression"
		)
			return [undefined, [node.argument]]
		if (node.type === "ForInStatement") return [undefined, [node.right]]
		if (node.type === "BinaryExpression" && node.operator === "in") {
			const key = node.left.type === "Literal" ? node.left.value : undefined
			// e.g. `"and" in T`, which a validator answers with the member that throws in its place
			return typeof key === "string" && key in typeMemberKinds ?
					undefined
				:	[key, [node.right]]
		}
		if (node.type !== "CallExpression") return
		const callee = normalize(node.callee)
		if (callee.type !== "MemberExpression") return
		const global = normalize(callee.object)
		if (
			global.type !== "Identifier" ||
			module.scopes.referencesById.get(global)?.binding
		)
			return
		const name = memberNameOf(callee)
		const args = node.arguments.filter(arg => arg.type !== "SpreadElement")
		return (
			global.name === "JSON" && name === "stringify" ?
				["toJSON", args.slice(0, 1)]
			: (
				(global.name === "Object" && name !== "is") || global.name === "Reflect"
			) ?
				[undefined, args]
			:	undefined
		)
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

	// e.g. `forms.create` with `forms = { create() { ... } }`
	private methodOf(
		callee: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): [FunctionNode, SourceModule] | undefined {
		if (callee.type !== "MemberExpression") return
		const literal = this.literalOf(callee.object, module, kindOfKey)
		const value = literal && this.valueIn(literal, memberNameOf(callee))
		const fn = value && namedFunctionOf(normalize(value.node), value.module)
		return fn && isFunctionNode(fn) ? [fn, value.module] : undefined
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
			const fn =
				target.kind === "expression" &&
				namedFunctionOf(normalize(target.node), target.module)
			return fn && isFunctionNode(fn) ? [fn, target.module] : undefined
		}
		const fn = functionOfBinding(binding, module)
		return fn && [fn, module]
	}

	helperOf(
		callee: Node,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		if (isFunctionNode(normalize(callee))) return
		const helper = this.functionOf(callee, module)
		return helper && isStatic(helper[0]) ? helper : undefined
	}

	// e.g. a Type, an object literal holding one, or a function whose call returns one or, as a static helper, composes one
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
			const named = namedFunctionOf(node, module)
			if (isFunctionNode(named)) fn = [named, module]
		}
		const returned = fn && returnedOf(fn[0])
		const literal =
			this.targetLiteralOf(target, this.finalKindOfKey, new Set()) ??
			(fn && returned && this.literalOf(returned, fn[1], this.finalKindOfKey))
		const held = literal ? this.heldKindOf(literal) : 0
		return (
			isArk(held) ||
			isFactory(held) ||
			(!!fn &&
				(isArk(this.finalKindOfKey(...fn)) ||
					(isStatic(fn[0]) && this.composesArk(...fn))))
		)
	}

	// e.g. `t => t.and(A)`, each call to which is a site
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

// e.g. `{ User }` for `() => ({ User })`, or for a function declaring `User` before returning it
const returnedOf = (fn: FunctionNode): Node | undefined =>
	isStatic(fn) ? staticBodyOf(fn) : onlyReturnOf(fn)

// e.g. `a` and `get b() {}` in `{ a, get b() {} }`, or a class's static fields and getters
const membersOf = (literal: Node): (ObjectPropertyKind | ClassElement)[] =>
	literal.type === "ObjectExpression" ? literal.properties
	: literal.type === "ClassDeclaration" || literal.type === "ClassExpression" ?
		literal.body.body.filter(element => "static" in element && element.static)
	:	[]

// e.g. `x` in `{ a: x }` or `static a = x`, or a getter's function
const memberValueOf = (member: Node): Node | null =>
	(
		member.type === "Property" ||
		member.type === "PropertyDefinition" ||
		member.type === "AccessorProperty" ||
		member.type === "MethodDefinition"
	) ?
		member.value
	:	member

const accessorKindOf = (member: Node): "get" | "set" | undefined =>
	(
		(member.type === "Property" || member.type === "MethodDefinition") &&
		(member.kind === "get" || member.kind === "set")
	) ?
		member.kind
	:	undefined

const onlyReturnOf = (fn: FunctionNode): Node | undefined => {
	if (fn.async || fn.generator || fn.body?.type !== "BlockStatement") return
	let result: Node | null | undefined
	let returns = 0
	walk(fn.body, node => {
		if (isFunctionNode(node)) return false
		if (node.type === "ReturnStatement") {
			returns++
			result = node.argument
		}
		return true
	})
	return returns === 1 ? (result ?? undefined) : undefined
}

const isStatic = (fn: FunctionNode): boolean =>
	!!staticBodyOf(fn) && !readsArguments(fn)

const functionOfBinding = (
	binding: Binding,
	module: SourceModule
): FunctionNode | undefined => {
	if (binding.writes.length) return
	const fn =
		binding.kind === "function" ? binding.declaration
		: (
			binding.kind === "const" &&
			binding.declaration.type === "VariableDeclarator"
		) ?
			binding.declaration.init &&
			namedFunctionOf(unwrapExpression(binding.declaration.init), module)
		:	undefined
	return fn && isFunctionNode(fn) ? fn : undefined
}

// esbuild's keepNames, as under tsx, names a function `__name(fn, "name")`, whose helper defines the name and returns `fn`
const namedFunctionOf = (node: Node, module: SourceModule): Node => {
	if (
		node.type !== "CallExpression" ||
		node.arguments.length !== 2 ||
		node.arguments[1].type !== "Literal" ||
		typeof node.arguments[1].value !== "string"
	)
		return node
	const namer = initOf(node.callee, module)
	if (
		namer?.type !== "ArrowFunctionExpression" ||
		namer.body.type !== "CallExpression" ||
		namer.body.callee.type !== "Identifier"
	)
		return node
	const define = namer.body.callee
	const [target, value] = namer.params.map(param =>
		param.type === "Identifier" ? param.name : ""
	)
	// a minifier renames the parameters and writes `true` as `!0`
	const call = compactTextOf(namer.body, module)
		.replace("{value,", "{value:value,")
		.replace("!0", "true")
	const defineProperty = initOf(define, module)
	return (
			namer.params.length === 2 &&
				target &&
				call ===
					`${define.name}(${target},"name",{value:${value},configurable:true})` &&
				defineProperty?.type === "MemberExpression" &&
				compactTextOf(defineProperty, module) === "Object.defineProperty" &&
				!module.scopes.referencesById.get(defineProperty.object)?.binding
		) ?
			normalize(node.arguments[0])
		:	node
}

// e.g. `f` in the statement `__name(f, "f")` after `function f() {}`, which neither calls `f` nor passes it anywhere
const isNamed = (node: Node, module: SourceModule): boolean =>
	node.parent?.parent?.type === "ExpressionStatement" &&
	namedFunctionOf(node.parent, module) === node

// e.g. `f` in `export { f }`, whose importers' uses are checked where they occur, or in keepNames' `__name(f, "f")`
export const isPassiveReference = (id: Node, module: SourceModule): boolean =>
	id.parent?.type === "ExportSpecifier" || isNamed(id, module)

const initOf = (node: Node, module: SourceModule): Node | undefined => {
	const binding =
		node.type === "Identifier" ?
			module.scopes.referencesById.get(node)?.binding
		:	undefined
	return (
			binding &&
				!binding.writes.length &&
				binding.declaration.type === "VariableDeclarator" &&
				binding.declaration.init
		) ?
			unwrapExpression(binding.declaration.init)
		:	undefined
}

const compactTextOf = (node: Node, module: SourceModule) =>
	module.textOf(node).replace(/\s/g, "")

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
	if (node.parent && namedFunctionOf(node.parent, module) === node)
		node = node.parent
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

// only a statement's first variable, so nothing the statement runs comes before its site
export const declarationStartOf = (node: Node): number | undefined => {
	const declarator = node.parent
	if (declarator?.type !== "VariableDeclarator" || declarator.init !== node)
		return
	const declaration = declarator.parent
	if (
		declaration?.type !== "VariableDeclaration" ||
		declaration.declarations[0] !== declarator
	)
		return
	const statement =
		declaration.parent?.type === "ExportNamedDeclaration" ?
			declaration.parent
		:	declaration
	return statement.parent?.type === "Program" ? statement.start : undefined
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
