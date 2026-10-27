import { Callable, includes } from "@ark/util"
import * as arkregex from "arkregex"
import * as arktype from "arktype"
import * as arktypeCodecs from "arktype/codecs"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as arktypeConfig from "arktype/config"
import type { BaseRoot, GenericRoot } from "@ark/schema"
import type { Generic } from "arktype/internal/generic.ts"
import type {
	IntrospectionMember,
	UnavailableMember,
	Validator
} from "arktype/internal/runtime.ts"
import type { Scope } from "arktype/internal/scope.ts"
import type { TypeParser } from "arktype/internal/type.ts"
import { introspectionMembers } from "arktype/internal/standalone.ts"
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
	FunctionBody,
	ImportDeclaration,
	ImportSpecifier,
	MemberExpression,
	NewExpression,
	Node,
	ObjectPropertyKind,
	TSInterfaceDeclaration,
	TSSignature,
	TSType,
	TSTypeAnnotation,
	TSTypeParameter,
	TSTypeAliasDeclaration,
	Span,
	VariableDeclarator
} from "oxc-parser"
import { dirname, join } from "node:path"
import { isArkValue } from "./builtins.ts"
import {
	dependencyOf,
	optsIn,
	printablePathOf,
	type DependencyModes,
	type PrecompileHost
} from "./host.ts"
import { SourceModule } from "./module.ts"
import {
	declaredIds,
	exportNameOf,
	isTransparent,
	isWriteTarget,
	unwrapChain,
	operatorOf,
	runtimeParamsOf,
	unwrapExpression,
	walk,
	type Binding,
	type Reference
} from "./scope.ts"

export type FunctionNode = Function | ArrowFunctionExpression

// what reachesUnseen has followed, and whether importers can read an export
interface Reach {
	exact: Set<Node>
	held: Set<Node>
	isReadable: (exported: ImportTarget) => boolean
}

export type ArkExportName =
	| keyof typeof arktype
	| keyof typeof arktypeCodecs
	| keyof typeof arktypeConfig
	| keyof typeof arkregex

const arktypeNamespacesBySpecifier: Record<string, object> =
	Object.setPrototypeOf(
		{
			arktype,
			"arktype/codecs": arktypeCodecs,
			"arktype/config": arktypeConfig,
			arkregex
		},
		null
	)

export const runtimeExports: Record<string, 1> = Object.setPrototypeOf(
	{
		ArkErrors: 1,
		firstIssue: 1,
		ParseError: 1,
		Traversal: 1,
		TraversalError: 1
	} satisfies { [name in ArkExportName]?: 1 },
	null
)

// functions reading errors that arktype/runtime doesn't export
export const errorReaders: Record<string, 1> = Object.setPrototypeOf(
	{
		byAncestorPath: 1,
		byPath: 1,
		flatByPath: 1,
		flatProblemsByPath: 1,
		messageIn: 1
	} satisfies { [name in ArkExportName]?: 1 },
	null
)

// configure() runs as a call the build rewrites to pass its fingerprint
export const isRuntimeExport = (name: string): boolean =>
	name in runtimeExports || name === "configure"

const arkExports = new Set(
	Object.values(arktypeNamespacesBySpecifier).flatMap(namespace =>
		Object.entries(namespace).flatMap(([name, value]) =>
			name in runtimeExports ? [] : [value]
		)
	)
)

// what the standalone runtime freezes
export const isArkObject = (value: unknown): boolean =>
	isArkValue(value) || value instanceof Callable || arkExports.has(value)

export const runtimeMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		assert: 1,
		allows: 1,
		from: 1,
		traverse: 1,
		tAllows: 1,
		tApply: 1,
		"~standard": 1
	},
	null
)

// the Type members a validator can have, as any other reads undefined
export const validatorMembers: Record<string, 1> = Object.setPrototypeOf(
	{
		meta: 1,
		allows: 1,
		assert: 1,
		traverse: 1,
		from: 1,
		"~standard": 1
	} satisfies Record<
		Exclude<keyof Validator, keyof globalThis.Function | IntrospectionMember>,
		1
	>,
	null
)

// e.g. `assert` or `toString`, which a validator serves, ending a site
export const isValidatorMember = (name: unknown): boolean =>
	typeof name === "string" &&
	(name in validatorMembers || name in Function.prototype)

// documented members a node's content alone decides
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
		encode: 1,
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
		is: 1,
		assertIs: 1,
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
						"kind" | "inner" | "is" | "assertIs" | "traverse" | "toString"
				  >,
				UnstableArkMember
			>,
			1
		>
	>,
	null
)

// a Scope's members its definitions alone decide, unlike its `name`
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
		baseInstance: 1
	} satisfies Partial<
		Record<
			| Exclude<keyof Generic, keyof Object | UnstableArkMember>
			| Extract<keyof GenericRoot, "baseInstance">,
			1
		>
	>,
	null
)

// e.g. `json`, which a standalone build folds at a site of its own
export const isIntrospectedProperty = (name: unknown): boolean =>
	name === "expression" || name === "description" || name === "json"

// what counts nodes or names registry entries, so differs per build
export const unstableArkMembers = {
	__proto__: null,
	id: 1,
	hash: 1,
	innerHash: 1,
	json: 1,
	typeJson: 1,
	innerJson: 1,
	metaJson: 1,
	bareJson: 1,
	toJSON: 1,
	references: 1,
	shallowRefs: 1,
	precompilation: 1
}

type UnstableArkMember = keyof typeof unstableArkMembers

// what a standalone build replaces with an object holding none of its members
export type StandInKind = "Scope" | "Generic"

const kinds = {
	type: 1,
	// a Scope, Module, Generic or method, or what only the build can read
	otherArk: 2,
	// a value arktype didn't create
	data: 4,
	// a function whose call may return a Type
	returnsType: 8,
	// a function whose call may return any arktype value
	returnsArk: 16,
	// data the build lost track of, which may be a Type
	unknown: 32,
	// data whose members the build lost track of, which may hold a Type
	holder: 64,
	// a function whose call may return what the build lost track of
	returnsUnsure: 128,
	// data the build has no source for, like an exported function's
	// parameter, which may be a Type
	opaque: 256,
	// data whose members the build has no source for, like one a type
	// annotation declares `unknown`
	opaqueHolder: 512
} as const

type KindBits = number

const anyKind: KindBits =
	kinds.type |
	kinds.otherArk |
	kinds.data |
	kinds.returnsType |
	kinds.returnsArk

const typeMethod: KindBits = kinds.otherArk | kinds.returnsType

// a Generic, which an instantiation reads as a Type
const genericKind: KindBits = kinds.otherArk | kinds.returnsType

// what `type` holds that creates a Type, e.g. `type.or`
const typeParserTypes: Record<string, 1> = Object.setPrototypeOf(
	{
		raw: 1,
		unit: 1,
		enumerated: 1,
		valueOf: 1,
		instanceOf: 1,
		or: 1,
		and: 1,
		merge: 1,
		pipe: 1
	} satisfies Partial<Record<keyof TypeParser, 1>>,
	null
)

const arkBits: KindBits =
	kinds.type | kinds.otherArk | kinds.returnsType | kinds.returnsArk

const unsure: KindBits = kinds.data | kinds.unknown

const opaque: KindBits = kinds.data | kinds.opaque

const opaqueBits: KindBits = kinds.opaque | kinds.opaqueHolder

// what a value holding `held` is, as a literal holding a Type passed to a
// parameter is a holder
const holderOf = (held: KindBits): KindBits =>
	held & ~(kinds.data | opaqueBits) ? kinds.data | kinds.holder
	: held & opaqueBits ? opaque
	: kinds.data

// what is read off a value the build lost track of
const unsureOf = (kind: KindBits): KindBits =>
	kind & (kinds.unknown | kinds.holder) ? unsure
	: kind & opaqueBits ? opaque
	: 0

// what a value may be once the build loses track of it
const lostOf = (kind: KindBits): KindBits =>
	kind & ~(kinds.data | opaqueBits) ? unsure
	: kind & opaqueBits ? opaque
	: kinds.data

// e.g. `User` in `_unref(User)`, as Vue compiles a script setup binding its
// template reads, which returns what isn't a ref
const unrefedOf = (call: CallExpression, module: SourceModule) => {
	const callee = unwrapChain(call.callee)
	const declaration =
		callee.type === "Identifier" ?
			module.scopes.byId.get(callee)?.binding?.declaration
		:	undefined
	const [arg] = call.arguments
	return (
			declaration?.type === "ImportSpecifier" &&
				exportNameOf(declaration.imported) === "unref" &&
				/^(?:vue|@vue\/[\w-]+)$/.test(
					(declaration.parent as ImportDeclaration).source.value
				) &&
				arg?.type !== "SpreadElement"
		) ?
			arg
		:	undefined
}

// what a render function Vue compiles reads a component's script through
const componentContexts: Record<string, 1> = Object.setPrototypeOf(
	{ _ctx: 1, $setup: 1, $data: 1 },
	null
)

// methods by which an array, Map or Set holds what it's passed
const storingMethods: Record<string, 1> = Object.setPrototypeOf(
	{ push: 1, unshift: 1, splice: 1, fill: 1, set: 1, add: 1 },
	null
)

// methods by which an array, Map or Set changes what it holds
const mutatingMethods: Record<string, 1> = Object.setPrototypeOf(
	{
		...storingMethods,
		pop: 1,
		shift: 1,
		sort: 1,
		reverse: 1,
		copyWithin: 1,
		delete: 1,
		clear: 1
	},
	null
)

// the kind of each member of a Type a standalone validator lacks
const typeMemberKinds: Record<string, KindBits> = Object.setPrototypeOf(
	{
		in: kinds.type,
		out: kinds.type,
		encode: kinds.type,
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
		// the Type's node, so a member of a Type's data is data off it too
		internal: kinds.type | kinds.data,
		$: anyKind,
		precompilation: kinds.data
	} satisfies Record<UnavailableMember, KindBits>,
	null
)

const exportKindOf = (name: ArkExportName): KindBits =>
	isRuntimeExport(name) || name in errorReaders ? kinds.data
	: name === "type" ? kinds.otherArk | kinds.returnsType | kinds.returnsArk
	: name === "codec" ? typeMethod
	: kinds.otherArk | kinds.returnsArk

// e.g. a Type for `T.in`, a method for `T.and`, data for `T.expression`
const memberKindOf = (objectKind: KindBits, name: unknown): KindBits => {
	if (!isArk(objectKind))
		return (objectKind & kinds.data) | unsureOf(objectKind)
	const kind =
		// a Module member's kind is its alias's, whatever its name
		typeof name !== "string" || objectKind & kinds.otherArk ? anyKind
		: (
			isValidatorMember(name) ||
			name in runtimeMembers ||
			name in unstableArkMembers ||
			includes(introspectionMembers, name)
		) ?
			kinds.data
		:	(typeMemberKinds[name] ?? anyKind)
	return kind | (objectKind & kinds.data) | unsureOf(objectKind)
}

const callKindOf = (callee: KindBits): KindBits =>
	(callee & (kinds.type | kinds.data) ? kinds.data : 0) |
	(callee & kinds.returnsType ? kinds.type : 0) |
	(callee & kinds.returnsArk ? anyKind : 0) |
	(callee & kinds.returnsUnsure ? unsure : 0) |
	unsureOf(callee)

const functionKindOf = (returned: KindBits): KindBits =>
	kinds.data |
	(returned & kinds.type ? kinds.returnsType : 0) |
	(returned & (anyKind & ~kinds.type & ~kinds.data) ? kinds.returnsArk : 0) |
	(returned & (kinds.unknown | kinds.holder | opaqueBits) ?
		kinds.returnsUnsure
	:	0)

export const isArk = (kind: KindBits): boolean =>
	(kind & (kinds.type | kinds.otherArk)) !== 0

// e.g. what a call off a Module returns, as it may be any arktype value
export const mayBeOtherArk = (kind: KindBits): boolean =>
	(kind & kinds.otherArk) !== 0

// e.g. a literal holding a Scope, or what the build lost track of
export const mayHoldArk = (kind: KindBits): boolean =>
	(kind & (kinds.holder | kinds.unknown)) !== 0

export const isOnlyType = (kind: KindBits): boolean =>
	(kind & (kinds.type | kinds.otherArk | kinds.data)) === kinds.type

const isFactory = (kind: KindBits): boolean =>
	(kind & (kinds.returnsType | kinds.returnsArk)) !== 0

// e.g. `T => T.or("null")`, whose call returns a Type when passed one
export const mayReturnArk = (kind: KindBits): boolean =>
	isFactory(kind) || (kind & kinds.returnsUnsure) !== 0

interface Application {
	fn: FunctionNode
	args: readonly KindBits[]
}

// e.g. `user` of `class { user = type(...) }` or `opts => opts.user`
interface Member {
	owner: Node | Binding
	name: unknown
}

type Key = Binding | FunctionNode | Application | Member

type KindOfKey = (key: Key, module: SourceModule) => KindBits

// where a key is declared, e.g. a binding's id
const anchorOf = (key: Key): Span =>
	"kind" in key ? key.id
	: "args" in key ? key.fn
	: "owner" in key ?
		"type" in key.owner ?
			key.owner
		:	key.owner.id
	:	key

// e.g. `{ t }` from `wrap(A)` with `wrap = t => ({ t })`
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
	// a package the build does not follow
	| { kind: "package"; message: string }

export class ModuleGraph {
	host: PrecompileHost
	cwd: string | undefined
	private modulesById: Record<string, SourceModule | ImportTarget> =
		Object.create(null)
	private kindsByKey = new Map<Key, KindBits>()
	private kindsByNode = new Map<Node, KindBits>()
	private localTypesByModule = new WeakMap<
		SourceModule,
		Record<string, LocalType | null>
	>()
	// a helper's parameters as one call passes them
	private bindingKindOfKeys = new WeakSet<KindOfKey>()
	private applicationsByFn = new Map<FunctionNode, Map<string, Application>>()
	private membersByOwner = new Map<Node | Binding, Map<unknown, Member>>()
	private resolving = new Set<Node>()
	private heldKindsByNode = new Map<Node, KindBits>()
	private writesByBinding = new WeakMap<Binding, Node[]>()
	private importsById: Record<string, string[]> = Object.create(null)
	private optsInByPackage: Record<string, boolean> = Object.create(null)
	// how the program's settings build packages that don't opt in
	dependencies: DependencyModes
	private packageNamesByDir: Record<string, string | undefined> =
		Object.create(null)

	constructor(
		host: PrecompileHost,
		cwd?: string,
		dependencies: DependencyModes = {}
	) {
		this.host = host
		this.cwd = cwd
		this.dependencies = dependencies
	}

	pathOf(id: string): string {
		return this.cwd === undefined ? id : printablePathOf(this.cwd, id)
	}

	add(id: string, source: string, mappings?: string): SourceModule {
		const existing = this.modulesById[id]
		// a program evaluates a module once, so it stays as the graph holds it
		if (existing instanceof SourceModule && existing.source === source)
			return existing
		if (existing) this.dropImportersOf(id)
		const module = new SourceModule(id, source, this.pathOf(id), mappings)
		this.modulesById[id] = module
		return module
	}

	// each importer read the previous version, so it's evaluated again
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

	moduleOf(id: string): SourceModule | ImportTarget {
		return (this.modulesById[id] ??= this.load(id, this.pathOf(id)))
	}

	resolve(
		specifier: string,
		importer: SourceModule,
		isValueImport?: () => boolean
	): ImportTarget | SourceModule {
		if (specifier in arktypeNamespacesBySpecifier) {
			return {
				kind: "arktypeNamespace",
				specifier,
				value: arktypeNamespacesBySpecifier[specifier]
			}
		}
		const id = this.host.resolve(specifier, importer.id, isValueImport)
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

	// a module outside node_modules, or in a package that opts in or the
	// program's settings precompile
	isFollowed(id: string): boolean {
		const [root, name] = dependencyOf(id) ?? []
		return (
			root === undefined ||
			(this.optsInByPackage[root] ??=
				this.dependencies[name!] === "aot" ||
				optsIn(this.host.readFile(join(root, "package.json"))))
		)
	}

	// e.g. `arksets` for a module a workspace links from its source
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
		node = unwrapChain(node)
		const id =
			node.type === "MemberExpression" ? unwrapChain(node.object) : node
		const reference =
			id.type === "Identifier" ? module.scopes.byId.get(id) : undefined
		const [name, read] =
			(reference && this.arkExportOf(reference, module)) ?? []
		return read === node ? name : undefined
	}

	kindOf(node: Node, module: SourceModule): KindBits {
		let result = this.kindsByNode.get(node)
		if (result === undefined) {
			result = this.transfer(node, module, this.finalKindOfKey)
			this.kindsByNode.set(node, result)
		}
		return result
	}

	private finalKindOfKey: KindOfKey = (key, module) =>
		this.kindsByKey.get(key) ?? this.solve(key, module)

	bindingKindOf(binding: Binding, module: SourceModule): KindBits {
		return this.finalKindOfKey(binding, module)
	}

	// a least fixpoint: a key is re-solved only when one it read grew
	private solve(key: Key, module: SourceModule): KindBits {
		// a fresh set, so a key never sees its own literal cut
		const resolving = this.resolving
		this.resolving = new Set()
		try {
			const assumed = new Map<Key, [KindBits, SourceModule]>([
				[key, [0, module]]
			])
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
		} finally {
			this.resolving = resolving
		}
	}

	private keyKindOf(
		key: Key,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		if ("args" in key) {
			return this.returnKindIn(
				key.fn,
				module,
				this.appliedKindOfKey(key, module, kindOfKey)
			)
		}
		if ("type" in key) return this.returnKindIn(key, module, kindOfKey)
		if ("owner" in key) {
			return "type" in key.owner ?
					this.fieldKindIn(key.owner, key.name, module, kindOfKey)
				:	this.passedMemberKindIn(key.owner, key.name, module, kindOfKey)
		}
		const binding = key
		switch (binding.kind) {
			case "import":
				return this.targetKindOf(this.importOf(binding, module), kindOfKey)
			case "param":
				return (
					this.paramKindOf(binding, module, kindOfKey) |
					this.writtenKindOf(binding, module, kindOfKey)
				)
			case "function":
				return (
					functionKindOf(
						kindOfKey(binding.declaration as FunctionNode, module)
					) | this.namespaceKindOf(binding, module, kindOfKey)
				)
			case "namespace":
			case "enum":
				return kinds.data | this.namespaceKindOf(binding, module, kindOfKey)
			// e.g. `C` given `static T = User` or `static { this.T = User }`
			case "class": {
				let held = this.heldKindOf({
					node: binding.declaration,
					module,
					kindOfKey
				})
				for (const write of this.writesThrough(binding, module)) {
					if (write.type === "AssignmentExpression")
						held |= this.transfer(write.right, module, kindOfKey)
				}
				return (
					holderOf(held) |
					this.storedKindOf(binding, module, kindOfKey) |
					this.namespaceKindOf(binding, module, kindOfKey)
				)
			}
			case "const":
			case "let":
			case "var":
				break
			default:
				return kinds.data
		}
		const declaration = binding.declaration
		const result =
			(declaration.type !== "VariableDeclarator" ? kinds.data
			: declaration.init ?
				this.patternKindOf(
					binding.id,
					declaration.id,
					this.transfer(declaration.init, module, kindOfKey),
					module,
					kindOfKey,
					{ node: declaration.init, module, kindOfKey }
				)
			:	this.iteratedKindOf(declaration, binding, module, kindOfKey)) |
			this.storedKindOf(binding, module, kindOfKey) |
			this.writtenKindOf(binding, module, kindOfKey)
		return annotate(result, this.annotatedKindOf(binding.id, module, kindOfKey))
	}

	// e.g. `User` for `x` given `x = User`
	private writtenKindOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		let result = 0
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
				:	this.destructuredWriteOf(write, module, kindOfKey)
		}
		return result
	}

	// e.g. `N` given `namespace N { export const User = type(...) }`, where
	// each declaration merged under its name adds its exports
	private namespaceKindOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		let held = 0
		let isNamespace = false
		for (let id of [binding.id, ...binding.writes]) {
			while (id.parent?.type === "TSQualifiedName") id = id.parent
			const declaration = id.parent
			if (declaration?.type !== "TSModuleDeclaration") continue
			isNamespace = true
			// e.g. `T` in `namespace A.B { export const T = ... }`, read off A
			walk(declaration, node => {
				if (node.type === "ExportNamedDeclaration" && node.declaration) {
					for (const exported of declaredIds(node.declaration)) {
						const inner = module.scopes.bindingsById.get(exported)
						if (inner) held |= kindOfKey(inner, module)
					}
				}
				return node === declaration || node.type === "TSModuleBlock"
			})
		}
		if (!isNamespace) return 0
		for (const write of this.writesThrough(binding, module)) {
			if (write.type === "AssignmentExpression")
				held |= this.transfer(write.right, module, kindOfKey)
		}
		return holderOf(held)
	}

	// e.g. `list.push(A)`, `o.User = A` or `Object.assign(o, { A })`
	private storedKindOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		let stored = 0
		for (const { id } of binding.references) {
			const [operand, member] = operatorOf(id)
			if (
				member?.type === "CallExpression" &&
				member.arguments[0] === operand &&
				this.isGlobalMember(member.callee, module, "Object", "assign")
			) {
				for (const arg of member.arguments.slice(1))
					stored |= this.transfer(arg, module, kindOfKey)
				continue
			}
			if (member?.type !== "MemberExpression" || member.object !== operand)
				continue
			const [callee, parent] = operatorOf(member)
			if (parent?.type === "AssignmentExpression" && parent.left === callee)
				stored |= this.transfer(parent.right, module, kindOfKey)
			else if (
				parent?.type === "CallExpression" &&
				parent.callee === callee &&
				(memberNameOf(member) as never) in storingMethods
			) {
				for (const arg of parent.arguments)
					stored |= this.transfer(arg, module, kindOfKey)
			}
		}
		return holderOf(stored) & ~kinds.data
	}

	// e.g. what `assigned` may be after `({ assigned } = { assigned: A })`
	private destructuredWriteOf(
		write: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		let root = write
		while (root.parent && isPatternPart(root.parent)) root = root.parent
		const parent = root.parent
		return parent?.type === "AssignmentExpression" && parent.left === root ?
				lostOf(this.transfer(parent.right, module, kindOfKey))
			:	kinds.data
	}

	// e.g. `A | B` for `t` in `for (const t of [A, B])`
	private iteratedKindOf(
		declarator: Node,
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const loop = declarator.parent?.parent
		if (
			loop?.type !== "ForOfStatement" ||
			loop.left !== declarator.parent ||
			declarator.type !== "VariableDeclarator"
		)
			return kinds.data
		const iterated = this.literalOf(loop.right, module, kindOfKey)
		// each element, so a pattern destructures what it holds
		if (
			iterated?.node.type === "ArrayExpression" &&
			iterated.node.elements.every(element => element?.type !== "SpreadElement")
		) {
			let result = 0
			for (const element of iterated.node.elements) {
				if (!element) continue
				const source = { ...iterated, node: element }
				result |= this.patternKindOf(
					binding.id,
					declarator.id,
					this.transfer(element, iterated.module, iterated.kindOfKey),
					module,
					kindOfKey,
					source
				)
			}
			return result
		}
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

	// e.g. `A | B` for `t` given `f(A)` and `f(B)`, or any if `f` escapes
	private paramKindOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const fn = binding.declaration as FunctionNode
		const params = runtimeParamsOf(fn)
		const index = params.findIndex(param => contains(param, binding.id))
		const calls = this.callsOf(fn, module)
		if (index === -1) return kinds.data
		const param = params[index]
		// e.g. `ts` in `(...ts) => ts[0].or("null")`, holding what it's passed
		if (param.type === "RestElement") {
			let held = calls ? 0 : this.passedKindOf(fn, module, kindOfKey)
			for (const call of calls ?? []) {
				for (const arg of call.arguments.slice(index)) {
					held |=
						arg.type === "SpreadElement" ?
							memberKindOf(
								this.transfer(arg.argument, module, kindOfKey),
								undefined
							)
						:	this.transfer(arg, module, kindOfKey)
				}
			}
			return this.patternKindOf(
				binding.id,
				param.argument,
				holderOf(held),
				module,
				kindOfKey
			)
		}
		const annotated = this.annotatedKindOf(
			param.type === "AssignmentPattern" ? param.left : param,
			module,
			kindOfKey
		)
		let result = 0
		for (const call of calls ?? [undefined]) {
			result |= this.patternKindOf(
				binding.id,
				param,
				annotate(
					call ?
						this.argKindOf(call, params, index, module, kindOfKey)
					:	this.passedKindOf(fn, module, kindOfKey),
					annotated
				),
				module,
				kindOfKey
			)
		}
		return result
	}

	// what a call passes the parameter at index, e.g. what `[A]` holds for
	// `t` given `f(...[A])`, or an array of it for `...ts`
	private argKindOf(
		call: CallExpression | NewExpression,
		params: readonly Node[],
		index: number,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const args = call.arguments
		const spread = args.findIndex(arg => arg.type === "SpreadElement")
		const isRest = params[index]?.type === "RestElement"
		if (!isRest && (spread === -1 || index < spread)) {
			return args[index] ?
					this.transfer(args[index], module, kindOfKey)
				:	kinds.data
		}
		let held = 0
		for (const arg of args.slice(
			spread === -1 ? index : Math.min(spread, index)
		)) {
			held |=
				arg.type === "SpreadElement" ?
					memberKindOf(
						this.transfer(arg.argument, module, kindOfKey),
						undefined
					)
				:	this.transfer(arg, module, kindOfKey)
		}
		return isRest ? holderOf(held) : held | kinds.data
	}

	// e.g. `t` in `list.map(t => t.or(B))`
	private passedKindOf(
		fn: FunctionNode,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		let [operand, call] = operatorOf(fn)
		while (
			call?.type === "ArrayExpression" ||
			call?.type === "ObjectExpression" ||
			(call?.type === "Property" && call.value === operand)
		)
			[operand, call] = operatorOf(call)
		// e.g. an exported function or a method, called where the build can't see
		if (call?.type !== "CallExpression" || call.callee === operand)
			return opaque
		const callee = unwrapChain(call.callee)
		if (callee.type !== "MemberExpression") {
			return lostOf(
				this.transfer(callee, module, kindOfKey) &
					(kinds.returnsType | kinds.returnsArk)
			)
		}
		// a container method or `then` may pass what its receiver holds
		const name = memberNameOf(callee)
		return isContainerMethod(name) || name === "then" ?
				lostOf(
					this.transfer(callee.object, module, kindOfKey) &
						(kinds.unknown | kinds.holder)
				)
			:	kinds.data
	}

	// e.g. `Params` for `p` in `(p: Params) => p.or`, where `Params` is
	// computed, like `typeof f`, or `any`, which doesn't say `p` isn't a Type
	unreadAnnotationOf(node: Node, module: SourceModule): Node | undefined {
		let annotated = castOf(node)
		if (!annotated) {
			const id = unwrapChain(node)
			const binding =
				id.type === "Identifier" ?
					module.scopes.refsById.get(id)?.binding
				:	undefined
			const declaration = binding?.declaration
			// e.g. `def as Piped` for `p` in `const p = def as Piped`
			annotated =
				(
					declaration?.type === "VariableDeclarator" &&
					declaration.id === binding!.id &&
					declaration.init
				) ?
					(castOf(declaration.init) ?? binding!.id)
				:	binding?.id
		}
		const annotation =
			annotated && "typeAnnotation" in annotated ?
				annotated.typeAnnotation
			:	undefined
		if (!annotation) return
		const kind = this.annotatedKindOf(annotated!, module, this.finalKindOfKey)
		return kind === undefined || kind & kinds.opaque ? annotation : undefined
	}

	// e.g. unsure for `t: Type`, data for `s: JsonSchema`, none for `any`
	private annotatedKindOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits | undefined {
		return "typeAnnotation" in node && node.typeAnnotation ?
				this.typeKindOf(node.typeAnnotation, node, module, kindOfKey)
			:	undefined
	}

	// e.g. unsure for `Type<T>` or `{ user: Type }[]`, data for `string`
	private typeKindOf(
		type: TSType | TSTypeAnnotation,
		context: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		depth = 0
	): KindBits | undefined {
		const union = (
			types: (TSType | TSTypeAnnotation | null)[],
			depth: number
		) =>
			types.reduce<KindBits | undefined>((result, t) => {
				const kind =
					t ? this.typeKindOf(t, context, module, kindOfKey, depth) : kinds.data
				return result === undefined || kind === undefined ?
						undefined
					:	result | kind
			}, kinds.data)
		const signaturesKindOf = (signatures: TSSignature[]) =>
			this.signaturesKindOf(signatures, context, module, kindOfKey, depth)
		switch (type.type) {
			case "TSTypeAnnotation":
				return this.typeKindOf(
					type.typeAnnotation,
					context,
					module,
					kindOfKey,
					depth
				)
			case "TSAnyKeyword":
				return
			// says nothing at the top level, but data where nested
			case "TSUnknownKeyword":
			case "TSObjectKeyword":
				return depth < 2 ? undefined : kinds.data
			case "TSUnionType":
				return union(type.types, depth)
			case "TSIntersectionType": {
				const parts = type.types.map(t =>
					this.typeKindOf(t, context, module, kindOfKey, depth)
				)
				// e.g. `typeof def & { in: unknown }`, whose declared members say
				// it isn't a Type where nothing it's intersected with says it is
				const declared = parts.filter(
					kind =>
						kind !== undefined &&
						!(kind & (kinds.unknown | kinds.opaque | arkBits))
				)
				return (
						declared.length &&
							parts.every(
								kind =>
									kind === undefined || !(kind & (kinds.unknown | arkBits))
							)
					) ?
						declared.reduce<KindBits>((result, kind) => result | kind!, 0)
					:	union(type.types, depth)
			}
			case "TSArrayType":
				return union([type.elementType], depth + 1)
			// e.g. data for `(typeof names)[number]` or `Options["mode"]`, given
			// `names` or `Options` is, but not `Parameters<typeof f>[0]`, which
			// isn't a member of what it's passed
			case "TSIndexedAccessType": {
				const object = type.objectType
				if (
					object.type !== "TSTypeQuery" &&
					(object.type !== "TSTypeReference" || object.typeArguments)
				)
					return
				const kind = this.typeKindOf(object, context, module, kindOfKey, depth)
				return kind === undefined || isArk(kind) ?
						undefined
					:	memberKindOf(kind, undefined)
			}
			case "TSTypeLiteral":
				return signaturesKindOf(type.members)
			case "TSTypeQuery": {
				const binding =
					type.exprName.type === "Identifier" &&
					module.scopes.root.bindings[type.exprName.name]
				if (!binding) return
				const kind = kindOfKey(binding, module)
				// e.g. `typeof $`, whose value may be a Scope, as `$`'s may be
				return (
					(kind & ~arkBits) |
					(isArk(kind) ? unsure | (kind & kinds.otherArk) : 0)
				)
			}
			case "TSTypeReference": {
				const name = type.typeName
				const root = name.type === "TSQualifiedName" ? name.left : name
				if (root.type !== "Identifier") return
				// e.g. `T` in `<T extends Type>(t: T) => ...`
				const parameter = typeParameterOf(context, root.name)
				if (parameter) {
					return parameter.constraint ?
							this.typeKindOf(
								parameter.constraint,
								context,
								module,
								kindOfKey,
								depth
							)
						:	undefined
				}
				const imported = importedNameOf(module, root.name)
				if (imported) {
					const [specifier, importedName] = imported
					if (localSpecifier.test(specifier)) {
						// e.g. `T.Options` for `import type * as T from "./types.ts"`
						const exportName =
							name.type === "Identifier" ? importedName
							: (
								name.type === "TSQualifiedName" &&
								importedName === "*" &&
								name.left === root
							) ?
								name.right.name
							:	undefined
						return exportName === undefined ? undefined : (
								(this.exportedTypeKindOf(
									specifier,
									exportName,
									context,
									module,
									kindOfKey,
									depth
								) ?? undefined)
							)
					}
					const isArkTypeName =
						name.type === "TSQualifiedName" ?
							importedName === "*" ?
								name.right.name in arkTypeNames
							:	importedName === "type" && name.right.name === "Any"
						:	importedName in arkTypeNames
					if (!arkTypesSpecifier.test(specifier) || !isArkTypeName)
						return kinds.data
					return arkTypeKindOf(
						name.type === "TSQualifiedName" ? name.right.name : importedName
					)
				}
				const local = this.localTypeOf(module, root.name)
				if (!local) return union(type.typeArguments?.params ?? [], depth + 1)
				return this.declaredTypeKindOf(local, context, module, kindOfKey, depth)
			}
			case "TSLiteralType":
			case "TSTemplateLiteralType":
				return kinds.data
			default:
				return type.type.endsWith("Keyword") ? kinds.data : undefined
		}
	}

	// a type literal or interface isn't a Type, though a member typed
	// `unknown` may hold one, which reads off it are as off a parameter
	private signaturesKindOf(
		signatures: TSSignature[],
		context: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		depth: number
	): KindBits {
		let result: KindBits = kinds.data
		for (const signature of signatures) {
			const annotation =
				"typeAnnotation" in signature ? signature.typeAnnotation : null
			result |=
				(annotation &&
					this.typeKindOf(annotation, context, module, kindOfKey, depth + 1)) ??
				kinds.opaqueHolder
		}
		return result
	}

	private declaredTypeKindOf(
		declaration: LocalType,
		context: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		depth: number
	): KindBits | undefined {
		if (this.resolving.has(declaration)) return kinds.data
		this.resolving.add(declaration)
		try {
			return declaration.type === "TSInterfaceDeclaration" ?
					this.signaturesKindOf(
						declaration.body.body,
						context,
						module,
						kindOfKey,
						depth
					)
				:	this.typeKindOf(
						declaration.typeAnnotation,
						declaration,
						module,
						kindOfKey,
						depth
					)
		} finally {
			this.resolving.delete(declaration)
		}
	}

	// what the type a module exports as `name` says, as its own module reads
	// it, or null where the module doesn't export one
	private exportedTypeKindOf(
		specifier: string,
		name: string,
		context: Node,
		importer: SourceModule,
		kindOfKey: KindOfKey,
		depth: number,
		seen: Set<string> = new Set()
	): KindBits | undefined | null {
		if (!localSpecifier.test(specifier)) {
			return arkTypesSpecifier.test(specifier) && name in arkTypeNames ?
					arkTypeKindOf(name)
				:	kinds.data
		}
		// a type carries no value, so a host asks no bundler to resolve it
		const target = this.resolve(specifier, importer, () => false)
		if (!(target instanceof SourceModule)) return
		if (seen.has(target.id)) return null
		seen.add(target.id)
		const fromTarget = (specifier: string, name: string) =>
			this.exportedTypeKindOf(
				specifier,
				name,
				context,
				target,
				kindOfKey,
				depth,
				seen
			)
		for (const statement of target.program.body) {
			if (statement.type === "ExportNamedDeclaration") {
				const declaration = statement.declaration
				if (
					(declaration?.type === "TSInterfaceDeclaration" ||
						declaration?.type === "TSTypeAliasDeclaration") &&
					declaration.id.name === name
				) {
					return this.declaredTypeKindOf(
						declaration,
						context,
						target,
						kindOfKey,
						depth
					)
				}
				for (const exported of statement.specifiers) {
					if (exportNameOf(exported.exported) !== name) continue
					const localName = exportNameOf(exported.local)
					if (statement.source)
						return fromTarget(statement.source.value, localName)
					const local = this.localTypeOf(target, localName)
					if (local) {
						return this.declaredTypeKindOf(
							local,
							context,
							target,
							kindOfKey,
							depth
						)
					}
					const imported = importedNameOf(target, localName)
					return imported && imported[1] !== "*" ?
							fromTarget(...imported)
						:	undefined
				}
			} else if (
				statement.type === "ExportAllDeclaration" &&
				!statement.exported
			) {
				const kind = fromTarget(statement.source.value, name)
				if (kind !== null) return kind
			}
		}
		return null
	}

	// e.g. `type Schemas = { user: Type }`, unless the module declares two
	private localTypeOf(
		module: SourceModule,
		name: string
	): LocalType | undefined {
		let types = this.localTypesByModule.get(module)
		if (!types) {
			const found: Record<string, LocalType | null> = Object.create(null)
			walk(module.program, node => {
				if (
					node.type === "TSInterfaceDeclaration" ||
					node.type === "TSTypeAliasDeclaration"
				)
					found[node.id.name] = node.id.name in found ? null : node
				return true
			})
			this.localTypesByModule.set(module, (types = found))
		}
		return types[name] ?? undefined
	}

	// e.g. `f(A)`, `(t => t)(A)` or `new C(A)` for C's constructor, or
	// undefined if `f` escapes
	callsOf(
		fn: FunctionNode,
		module: SourceModule
	): (CallExpression | NewExpression)[] | undefined {
		const cls =
			(
				fn.parent?.type === "MethodDefinition" &&
				fn.parent.kind === "constructor"
			) ?
				fn.parent.parent!.parent!
			:	undefined
		const binding = bindingOfFunction(cls ?? fn, module)
		if (cls && (!binding || constructsReflectively(module))) return
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
		kind: KindBits,
		module: SourceModule,
		kindOfKey: KindOfKey,
		source?: Located
	): KindBits {
		if (node === pattern) return kind
		const parent = node.parent!
		const isRest = parent.type === "RestElement"
		const owner = isRest ? parent.parent! : parent
		// e.g. `type(...)` for `user` in `const { user } = { user: type(...) }`
		const held =
			source &&
			parent.type !== "AssignmentPattern" &&
			this.destructuredValueOf(
				owner.type === "Property" ? owner.parent! : owner,
				pattern,
				source
			)
		const literal =
			held && this.literalOf(held.node, held.module, held.kindOfKey)
		if (literal) {
			const value =
				isRest ? undefined : this.valueIn(literal, keyIn(owner, node))
			return value ?
					this.transfer(value.node, value.module, value.kindOfKey)
				:	kinds.data |
						(value === null ? 0 : this.heldKindOf(literal)) |
						unsureOf(kind)
		}
		// e.g. `User` in `const { User } = S`, with `S` a namespace import
		const exported =
			held &&
			parent.type === "Property" &&
			this.namespaceExportOf(held.node, keyNameOf(parent), held.module)
		if (exported) return this.targetKindOf(exported, held.kindOfKey)
		const alias =
			held && parent.type === "Property" ?
				this.aliasKindOf(
					held.node,
					keyNameOf(parent),
					held.module,
					held.kindOfKey
				)
			:	undefined
		if (alias !== undefined) return alias
		switch (parent.type) {
			case "Property":
				return memberKindOf(
					this.patternKindOf(
						parent.parent!,
						pattern,
						kind,
						module,
						kindOfKey,
						source
					),
					keyNameOf(parent)
				)
			case "AssignmentPattern":
				return (
					this.patternKindOf(parent, pattern, kind, module, kindOfKey, source) |
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
						kindOfKey,
						source
					),
					undefined
				)
		}
	}

	// e.g. `user` in `const { a: { user } } = { a: { user: type(...) } }`
	private destructuredValueOf(
		node: Node,
		pattern: Node,
		source: Located,
		seen = new Set<Node>()
	): Located | null | undefined {
		if (node === pattern) return source
		const owner = node.parent!
		if (owner.type !== "Property" && owner.type !== "ArrayPattern") return
		const held = this.destructuredValueOf(
			owner.type === "Property" ? owner.parent! : owner,
			pattern,
			source,
			seen
		)
		const literal =
			held && this.literalOf(held.node, held.module, held.kindOfKey, seen)
		return literal && this.valueIn(literal, keyIn(owner, node), seen)
	}

	private returnKindIn(
		fn: FunctionNode,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		if (fn.generator || !fn.body) return kinds.data
		const returned = this.returnedKindIn(fn.body, module, kindOfKey)
		return annotate(
			// e.g. a Type from `await load()`, which the build doesn't follow
			fn.async ? lostOf(returned) : returned,
			// e.g. data for `(): Promise<{ id: string }>`, as for a parameter
			fn.returnType ?
				this.typeKindOf(fn.returnType, fn, module, kindOfKey)
			:	undefined
		)
	}

	private returnedKindIn(
		body: NonNullable<FunctionNode["body"]>,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		if (body.type !== "BlockStatement")
			return this.transfer(body, module, kindOfKey)
		const statements = body.body
		// one that can end without a return statement returns undefined
		let result =
			statements[statements.length - 1]?.type === "ReturnStatement" ?
				0
			:	kinds.data
		walk(body, node => {
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

	private targetKindOf(
		target: ImportTarget,
		kindOfKey: KindOfKey,
		seen = new Set<SourceModule>()
	): KindBits {
		switch (target.kind) {
			case "arktype":
				return exportKindOf(target.name)
			case "arktypeNamespace":
				return kinds.otherArk
			case "binding":
				return kindOfKey(target.binding, target.module)
			case "expression":
				return this.transfer(target.node, target.module, kindOfKey)
			// e.g. `S` in `const { User } = S`, holding what its module exports
			case "namespace": {
				if (seen.has(target.module)) return kinds.data
				seen.add(target.module)
				let held = 0
				for (const name in target.module.scopes.exportsByName) {
					held |= this.targetKindOf(
						this.exportOf(target.module, name),
						kindOfKey,
						seen
					)
				}
				for (const specifier of target.module.scopes.starExports) {
					const exported = this.resolve(specifier, target.module)
					held |=
						exported instanceof SourceModule ?
							this.targetKindOf(
								{ kind: "namespace", module: exported },
								kindOfKey,
								seen
							)
						: exported.kind === "arktypeNamespace" ? kinds.otherArk
						: kinds.data
				}
				return holderOf(held)
			}
			default:
				return kinds.data
		}
	}

	private transfer(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const cast = castOf(node)
		if (cast) {
			// a cast is data whatever reached it
			if (
				this.annotatedKindOf(cast, module, () => kinds.unknown) === kinds.data
			)
				return kinds.data
			return annotate(
				this.transfer(unwrapChain(node), module, kindOfKey),
				this.annotatedKindOf(cast, module, kindOfKey)
			)
		}
		node = unwrapChain(node)
		const cached =
			this.bindingKindOfKeys.has(kindOfKey) ?
				undefined
			:	this.kindsByNode.get(node)
		if (cached !== undefined) return cached
		switch (node.type) {
			case "Identifier": {
				const binding = module.scopes.byId.get(node)?.binding
				return binding ? kindOfKey(binding, module) : kinds.data
			}
			case "ArrowFunctionExpression":
			case "FunctionExpression":
				return functionKindOf(kindOfKey(node, module))
			case "MemberExpression": {
				const exported = this.namespaceMemberOf(node, module)
				if (exported) return this.targetKindOf(exported, kindOfKey)
				const name = memberNameOf(node)
				const alias = this.aliasKindOf(node.object, name, module, kindOfKey)
				if (alias !== undefined) return alias
				const literal = this.literalOf(node.object, module, kindOfKey)
				if (literal) {
					// e.g. `o.a` in `const o = { a: o.a }`
					if (this.resolving.has(node)) return 0
					this.resolving.add(node)
					try {
						const value = this.valueIn(literal, name)
						// e.g. `list.at` or `schemas[key]`, which may read what a holder holds
						return value ?
								this.transfer(value.node, value.module, value.kindOfKey)
							:	kinds.data |
									(value === null ? 0 : this.heldKindOf(literal)) |
									unsureOf(this.transfer(node.object, module, kindOfKey))
					} finally {
						this.resolving.delete(node)
					}
				}
				if (typeof name === "string") {
					const cls = this.classOf(node.object, module, kindOfKey)
					if (cls) return kindOfKey(this.memberOf(cls.node, name), cls.module)
				}
				const passed = this.passedMemberKindOf(node, module, kindOfKey)
				if (passed !== undefined) return passed
				// the class of what a Type returns when validation fails
				if (
					name === "errors" &&
					this.arkExportNameOf(node.object, module) === "type"
				)
					return kinds.data
				return (
					memberKindOf(this.transfer(node.object, module, kindOfKey), name) |
					this.exposedKindOf(node, module, kindOfKey)
				)
			}
			case "CallExpression":
			case "TaggedTemplateExpression": {
				const callee = unwrapChain(
					node.type === "CallExpression" ? node.callee : node.tag
				)
				// e.g. `type({ a: "string" })`, as only parameters make a Generic
				if (
					node.type === "CallExpression" &&
					definesType(node) &&
					this.arkExportNameOf(callee, module) === "type"
				)
					return kinds.type
				if (
					callee.type === "MemberExpression" &&
					(memberNameOf(callee) as never) in typeParserTypes &&
					this.arkExportNameOf(callee.object, module) === "type"
				)
					return kinds.type
				// e.g. `$.type("User")`, with `$` a Scope
				if (
					node.type === "CallExpression" &&
					definesType(node) &&
					callee.type === "MemberExpression" &&
					memberNameOf(callee) === "type" &&
					this.scopeCallOf(callee.object, module, kindOfKey)
				)
					return kinds.type
				if (
					node.type === "CallExpression" &&
					this.definesGeneric(node, module, kindOfKey)
				)
					return genericKind
				const fn =
					this.functionOf(callee, module) ??
					this.methodOf(callee, module, kindOfKey)
				if (!fn) {
					const unrefed =
						node.type === "CallExpression" && unrefedOf(node, module)
					if (unrefed) return this.transfer(unrefed, module, kindOfKey)
					return (
						callKindOf(this.transfer(callee, module, kindOfKey)) |
						(node.type === "CallExpression" ?
							this.builtinPassedOf(node, module, kindOfKey)
						:	0)
					)
				}
				if (node.type !== "CallExpression" || !runtimeParamsOf(fn[0]).length)
					return kindOfKey(...fn)
				// e.g. `withId(A)` with `withId = t => t.and({ id: "string" })`, whose
				// parameters hold what this call passes, where callers the build
				// can't see may pass others
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
			case "ObjectExpression":
			case "ArrayExpression": {
				// e.g. `{ a: o.a }`, which holds nothing until it holds something else
				if (this.resolving.has(node)) return kinds.data
				this.resolving.add(node)
				try {
					return holderOf(this.heldKindOf({ node, module, kindOfKey }))
				} finally {
					this.resolving.delete(node)
				}
			}
			case "ThisExpression":
			case "NewExpression": {
				const owner = node.type === "ThisExpression" && ownerOf(node)
				if (owner && owner.type === "ObjectExpression")
					return this.transfer(owner, module, kindOfKey)
				const statics = node.type === "ThisExpression" && staticOwnerOf(node)
				// e.g. `static self = this`, which holds nothing until it holds something else
				if (statics) {
					if (this.resolving.has(node)) return kinds.data
					this.resolving.add(node)
					try {
						return holderOf(
							this.heldKindOf({ node: statics, module, kindOfKey })
						)
					} finally {
						this.resolving.delete(node)
					}
				}
				const cls = this.classOf(node, module, kindOfKey)
				return (
					cls ? this.instanceKindOf(cls, kindOfKey)
					: node.type === "NewExpression" ?
						this.builtinPassedOf(node, module, kindOfKey)
					:	kinds.data
				)
			}
			case "AwaitExpression":
				return this.transfer(node.argument, module, kindOfKey)
			default:
				return kinds.data
		}
	}

	// e.g. `Object.freeze(A)` or `new Proxy(A, {})`, as a builtin may return
	// what it's passed
	private builtinPassedOf(
		call: CallExpression | NewExpression,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		let root = unwrapChain(call.callee)
		while (root.type === "MemberExpression") root = unwrapChain(root.object)
		if (root.type !== "Identifier" || module.scopes.byId.get(root)?.binding)
			return 0
		return lostOf(
			call.arguments.reduce(
				(kind, arg) => kind | this.transfer(arg, module, kindOfKey),
				0
			)
		)
	}

	// e.g. an instance of `class { user = type(...) }`
	private instanceKindOf(cls: Located, kindOfKey: KindOfKey): KindBits {
		let held = 0
		for (const name in fieldValuesOf(cls.node))
			held |= kindOfKey(this.memberOf(cls.node, name), cls.module)
		return holderOf(held)
	}

	private memberOf(owner: Node | Binding, name: unknown): Member {
		let members = this.membersByOwner.get(owner)
		if (!members) this.membersByOwner.set(owner, (members = new Map()))
		let member = members.get(name)
		if (!member) members.set(name, (member = { owner, name }))
		return member
	}

	// e.g. `Object.assign`, unless the module binds `Object`
	private isGlobalMember(
		node: Node,
		module: SourceModule,
		global: string,
		name: string
	): boolean {
		node = unwrapChain(node)
		if (node.type !== "MemberExpression" || memberNameOf(node) !== name)
			return false
		const object = unwrapChain(node.object)
		return (
			object.type === "Identifier" &&
			object.name === global &&
			!module.scopes.byId.get(object)?.binding
		)
	}

	// e.g. the class of `this` in a method, of `new C()` or `extends C`
	private classOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): Located | undefined {
		node = unwrapChain(node)
		if (node.type === "ThisExpression") {
			const owner = ownerOf(node)
			return owner && owner.type !== "ObjectExpression" ?
					{ node: owner, module, kindOfKey }
				:	undefined
		}
		const literal = this.literalOf(
			node.type === "NewExpression" ? node.callee : node,
			module,
			kindOfKey
		)
		return (
				literal?.node.type === "ClassDeclaration" ||
					literal?.node.type === "ClassExpression"
			) ?
				literal
			:	undefined
	}

	// e.g. unsure for `this.user` given `user = type(...)`
	private fieldKindIn(
		cls: Node,
		name: unknown,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const values = fieldValuesOf(cls)[name as string]
		let held = 0
		for (const value of values ?? []) {
			// e.g. `schema` in `constructor(readonly schema: Schema) {}`
			const param = module.scopes.bindingsById.get(value)
			held |=
				param ? kindOfKey(param, module)
				: (
					value.parent?.type === "MethodDefinition" &&
					value.parent.kind === "get"
				) ?
					kindOfKey(value as FunctionNode, module)
				:	this.transfer(value, module, kindOfKey)
		}
		// e.g. `repo.schema = User`, which may write an instance's field
		for (const value of memberWritesOf(module)[name as string] ?? [])
			held |= this.transfer(value, module, kindOfKey)
		const parent =
			"superClass" in cls &&
			cls.superClass &&
			this.classOf(cls.superClass, module, kindOfKey)
		if (parent && this.mayDeclare(parent, name))
			held |= kindOfKey(this.memberOf(parent.node, name), parent.module)
		// e.g. a field a decorator, a subclass or a superclass the build can't
		// read sets
		else if (!values) held |= opaque
		return lostOf(held)
	}

	// whether a class or one it extends may set a field
	private mayDeclare(
		cls: Located,
		name: unknown,
		seen = new Set<Node>()
	): boolean {
		if (fieldValuesOf(cls.node)[name as string] || seen.has(cls.node))
			return true
		seen.add(cls.node)
		const superClass = "superClass" in cls.node && cls.node.superClass
		if (!superClass) return false
		const parent = this.classOf(superClass, cls.module, cls.kindOfKey)
		return !parent || this.mayDeclare(parent, name, seen)
	}

	// e.g. data for `opts.db` given `route({ db, input: type(...) })`
	// e.g. `$setup.User` in a render function Vue compiles, which reads what
	// the component's script exposes by that name: one of the module's
	// bindings for script setup, or what its `setup()` or `data()` returns
	private exposedKindOf(
		member: MemberExpression,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const object = unwrapChain(member.object)
		const name = memberNameOf(member)
		const context =
			object.type === "Identifier" ?
				module.scopes.byId.get(object)?.binding
			:	undefined
		if (
			context?.kind !== "param" ||
			!(context.name in componentContexts) ||
			typeof name !== "string"
		)
			return 0
		const { bindings } = module.scopes.root
		if (bindings[name]) return kindOfKey(bindings[name], module)
		const options =
			bindings._sfc_main &&
			this.bindingLiteralOf(bindings._sfc_main, module, kindOfKey, new Set())
		let result = 0
		for (const key of ["setup", "data"]) {
			const fn = options && this.valueIn(options, key)
			const returned = fn && isFunctionNode(fn.node) && returnedOf(fn.node)
			const exposed =
				returned && this.literalOf(returned, fn.module, fn.kindOfKey)
			const value = exposed && this.valueIn(exposed, name)
			if (value)
				result |= this.transfer(value.node, value.module, value.kindOfKey)
		}
		return result
	}

	private passedMemberKindOf(
		member: MemberExpression,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits | undefined {
		const object = unwrapChain(member.object)
		const binding =
			object.type === "Identifier" ?
				module.scopes.byId.get(object)?.binding
			:	undefined
		if (binding?.kind !== "param" || binding.id.parent?.type === "RestElement")
			return
		const fn = binding.declaration as FunctionNode
		if (
			!runtimeParamsOf(fn).includes(binding.id as never) ||
			!this.callsOf(fn, module) ||
			binding.writes.length ||
			this.annotatedKindOf(binding.id, module, kindOfKey) !== undefined
		)
			return
		return kindOfKey(this.memberOf(binding, memberNameOf(member)), module)
	}

	private passedMemberKindIn(
		param: Binding,
		name: unknown,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits {
		const fn = param.declaration as FunctionNode
		const index = runtimeParamsOf(fn).indexOf(param.id as never)
		let result = 0
		for (const call of this.callsOf(fn, module)!) {
			const args = call.arguments
			const spread = args.findIndex(arg => arg.type === "SpreadElement")
			const arg = args[index]
			if (spread !== -1 && spread <= index) {
				result |= memberKindOf(
					this.argKindOf(call, runtimeParamsOf(fn), index, module, kindOfKey),
					name
				)
				continue
			}
			if (!arg) {
				result |= kinds.data
				continue
			}
			const literal = this.literalOf(arg, module, kindOfKey)
			const value = literal && this.valueIn(literal, name)
			result |=
				value ? this.transfer(value.node, value.module, value.kindOfKey)
				: value === null ? kinds.data
				: memberKindOf(this.transfer(arg, module, kindOfKey), name)
		}
		return result
	}

	private applicationOf(
		call: CallExpression,
		fn: FunctionNode,
		module: SourceModule,
		kindOfKey: KindOfKey
	): Application {
		const params = runtimeParamsOf(fn)
		const args = params.map((_, i) =>
			this.argKindOf(call, params, i, module, kindOfKey)
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
		const derived = new Map<Key, KindBits>()
		const result: KindOfKey = (key, keyModule) => {
			const index =
				"kind" in key && key.kind === "param" && key.declaration === fn ?
					params.findIndex(param => contains(param, key.id))
				:	undefined
			// what fn declares, e.g. `N` in `{ const N = T.or("null"); return N }`
			// or the closure `() => T`, for the `T` passed, but not a call to fn
			// itself, applied with what that call passes
			const anchor = anchorOf(key)
			if (
				index === undefined &&
				(keyModule !== module || anchor === fn || !contains(fn, anchor))
			)
				return kindOfKey(key, keyModule)
			let kind = derived.get(key)
			if (kind !== undefined) return kind
			// what it holds where it's read while it's derived: a parameter what
			// the call passes, else what any call gives it
			kind =
				index === undefined ? kindOfKey(key, keyModule)
				: index === -1 ? kinds.data
				: this.patternKindOf(
						(key as Binding).id,
						params[index],
						args[index],
						module,
						result
					)
			derived.set(key, kind)
			kind =
				index === undefined ?
					this.keyKindOf(key, keyModule, result)
				:	kind | this.writtenKindOf(key as Binding, module, result)
			derived.set(key, kind)
			return kind
		}
		this.bindingKindOfKeys.add(result)
		return result
	}

	// e.g. `{ User }` for `schemas`, `make()` or `forms.create`
	private literalOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		seen = new Set<Node>()
	): Located | undefined {
		node = unwrapChain(node)
		if (seen.has(node)) return
		seen.add(node)
		switch (node.type) {
			case "ObjectExpression":
			case "ArrayExpression":
			case "ClassExpression":
				return { node, module, kindOfKey }
			case "ThisExpression": {
				const cls = staticOwnerOf(node)
				return cls && { node: cls, module, kindOfKey }
			}
			case "Identifier": {
				const binding = module.scopes.byId.get(node)?.binding
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

	// e.g. a Type for `M.User` with `M = scope({ User: { ... } }).export()`
	private aliasKindOf(
		object: Node,
		name: unknown,
		module: SourceModule,
		kindOfKey: KindOfKey
	): KindBits | undefined {
		const definition = this.moduleDefinitionOf(object, module, kindOfKey)
		const alias = definition && this.aliasIn(definition, name)
		// a name it lacks may still be a member written in or inherited
		if (!alias) return
		if (alias.isGeneric) return kinds.otherArk | kinds.returnsType
		const { node, module: valueModule, kindOfKey: valueKindOfKey } = alias.value
		if (this.moduleDefinitionOf(node, valueModule, valueKindOfKey))
			return kinds.otherArk
		const value = unwrapChain(node)
		// a definition, which a Scope resolves to a Type
		if (
			value.type === "Literal" ||
			value.type === "TemplateLiteral" ||
			value.type === "ObjectExpression" ||
			value.type === "ArrayExpression"
		)
			return kinds.type
		// e.g. a Type, but not a Module, Generic or thunk the build can't see into
		return isOnlyType(this.transfer(value, valueModule, valueKindOfKey)) ?
				kinds.type
			:	undefined
	}

	// the aliases of a Module whose definition the build can read whole
	private moduleDefinitionOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		seen = new Set<Node>()
	): Located | undefined {
		node = unwrapChain(node)
		if (seen.has(node)) return
		seen.add(node)
		if (node.type === "Identifier") {
			const init = this.constInitOf(node, module, kindOfKey)
			return (
				init &&
				this.moduleDefinitionOf(init.node, init.module, init.kindOfKey, seen)
			)
		}
		if (node.type === "MemberExpression") {
			// e.g. `defs.shop` with `import * as defs from "./defs.ts"`
			const init = this.constInitOf(node, module, kindOfKey)
			if (init) {
				return this.moduleDefinitionOf(
					init.node,
					init.module,
					init.kindOfKey,
					seen
				)
			}
			// e.g. `M.sub` with `sub: type.module({ ... })`
			const parent = this.moduleDefinitionOf(
				node.object,
				module,
				kindOfKey,
				seen
			)
			const alias = parent && this.aliasIn(parent, memberNameOf(node))
			return alias && !alias.isGeneric ?
					this.moduleDefinitionOf(
						alias.value.node,
						alias.value.module,
						alias.value.kindOfKey,
						seen
					)
				:	undefined
		}
		if (node.type !== "CallExpression") return
		const callee = unwrapChain(node.callee)
		if (callee.type !== "MemberExpression") return
		const method = memberNameOf(callee)
		// `scope({ ... }).export()` or `type.module({ ... })`
		const call =
			(
				method === "module" &&
				this.arkExportNameOf(callee.object, module) === "type"
			) ?
				{ node, module, kindOfKey }
			: method === "export" ? this.scopeCallOf(callee.object, module, kindOfKey)
			: undefined
		const arg = (call?.node as CallExpression | undefined)?.arguments[0]
		const definition =
			arg &&
			arg.type !== "SpreadElement" &&
			this.literalOf(arg, call!.module, call!.kindOfKey)
		return definition && definition.node.type === "ObjectExpression" ?
				definition
			:	undefined
	}

	// e.g. `scope({ ... })` for `$` with `const $ = scope({ ... })`
	// e.g. `generic("t")({ ... })` or `type("<t>", { ... })`, which only an
	// instantiation reads as a Type
	private definesGeneric(
		call: CallExpression,
		module: SourceModule,
		kindOfKey: KindOfKey
	): boolean {
		const callee = unwrapChain(call.callee)
		const [params] = call.arguments
		if (
			call.arguments.length === 2 &&
			params.type === "Literal" &&
			/^<.*>$/.test(String(params.value))
		)
			return this.isParser(callee, "type", module, kindOfKey)
		if (callee.type !== "CallExpression") return false
		const parser = unwrapChain(callee.callee)
		return (
			this.arkExportNameOf(parser, module) === "generic" ||
			this.isParser(parser, "generic", module, kindOfKey)
		)
	}

	// e.g. `type`, `type.generic` or `$.generic`, with `$` a Scope
	private isParser(
		node: Node,
		name: "type" | "generic",
		module: SourceModule,
		kindOfKey: KindOfKey
	): boolean {
		if (name === "type" && this.arkExportNameOf(node, module) === "type")
			return true
		return (
			node.type === "MemberExpression" &&
			memberNameOf(node) === name &&
			(this.arkExportNameOf(node.object, module) === "type" ||
				!!this.scopeCallOf(node.object, module, kindOfKey))
		)
	}

	private scopeCallOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey,
		seen = new Set<Node>()
	): Located | undefined {
		node = unwrapChain(node)
		if (seen.has(node)) return
		seen.add(node)
		if (node.type === "Identifier" || node.type === "MemberExpression") {
			const init = this.constInitOf(node, module, kindOfKey)
			return (
				init && this.scopeCallOf(init.node, init.module, init.kindOfKey, seen)
			)
		}
		return (
				node.type === "CallExpression" &&
					this.arkExportNameOf(node.callee, module) === "scope"
			) ?
				{ node, module, kindOfKey }
			:	undefined
	}

	// what a const binding is declared as, as one never written holds it,
	// e.g. `shop` or `defs.shop`, imported from where it's declared
	private constInitOf(
		node: Node,
		module: SourceModule,
		kindOfKey: KindOfKey
	): Located | undefined {
		if (node.type === "MemberExpression") {
			const target = this.namespaceMemberOf(node, module)
			return target && this.targetInitOf(target, kindOfKey)
		}
		const binding = module.scopes.byId.get(node)?.binding
		return binding && this.bindingInitOf(binding, module, kindOfKey)
	}

	private bindingInitOf(
		binding: Binding,
		module: SourceModule,
		kindOfKey: KindOfKey
	): Located | undefined {
		if (binding.writes.length || this.writesThrough(binding, module).length)
			return
		if (binding.kind === "import")
			return this.targetInitOf(this.importOf(binding, module), kindOfKey)
		const declaration = binding.declaration
		return (
				binding.kind === "const" &&
					declaration.type === "VariableDeclarator" &&
					declaration.id === binding.id &&
					declaration.init
			) ?
				{ node: declaration.init, module, kindOfKey }
			:	undefined
	}

	private targetInitOf(
		target: ImportTarget,
		kindOfKey: KindOfKey
	): Located | undefined {
		return (
			target.kind === "binding" ?
				this.bindingInitOf(target.binding, target.module, kindOfKey)
			: target.kind === "expression" ?
				{ node: target.node, module: target.module, kindOfKey }
			:	undefined
		)
	}

	// null where the definition has no alias by the name, undefined if unknown
	private aliasIn(
		definition: Located,
		name: unknown
	): { value: Located; isGeneric: boolean } | null | undefined {
		if (typeof name !== "string") return
		const properties = membersOf(definition.node)
		for (let i = properties.length - 1; i >= 0; i--) {
			const property = properties[i]
			if (property.type === "SpreadElement") {
				const { module, kindOfKey } = definition
				const spread =
					this.literalOf(property.argument, module, kindOfKey) ??
					this.moduleDefinitionOf(property.argument, module, kindOfKey)
				const alias =
					spread?.node.type === "ObjectExpression" ?
						this.aliasIn(spread, name)
					:	undefined
				if (alias !== null) return alias
				continue
			}
			const key = "key" in property ? keyNameOf(property) : undefined
			if (
				key === undefined ||
				accessorKindOf(property) ||
				property.type !== "Property"
			)
				return
			const alias = String(key)
			const paramsStart = alias.indexOf("<")
			if (
				alias[0] === "#" ||
				(paramsStart === -1 ? alias : alias.slice(0, paramsStart)) !== name
			)
				continue
			if (property.method) return
			return {
				value: { ...definition, node: property.value },
				isGeneric: paramsStart !== -1
			}
		}
		return null
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
		// a literal the program writes holds what the build can't tell
		if (binding.writes.length || this.writesThrough(binding, module).length)
			return
		if (binding.kind === "class")
			return { node: declaration, module, kindOfKey }
		if (
			binding.kind !== "const" ||
			declaration.type !== "VariableDeclarator" ||
			!declaration.init
		)
			return
		// e.g. `{ User }` for `users` in `const { users } = { users: { User } }`
		const held = this.destructuredValueOf(
			binding.id,
			declaration.id,
			{ node: declaration.init, module, kindOfKey },
			seen
		)
		return held ?
				this.literalOf(held.node, held.module, held.kindOfKey, seen)
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

	// null where the literal holds nothing at the key, undefined if unknown
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
	private heldKindOf(literal: Located, seen = new Set<Node>()): KindBits {
		const { node, module, kindOfKey } = literal
		const isCached =
			!seen.size && !this.resolving.size && kindOfKey === this.finalKindOfKey
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
		return this.namespaceExportOf(member.object, memberNameOf(member), module)
	}

	private namespaceExportOf(
		object: Node,
		name: unknown,
		module: SourceModule
	): ImportTarget | undefined {
		object = unwrapChain(object)
		const binding =
			object.type === "Identifier" ?
				module.scopes.byId.get(object)?.binding
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

	// e.g. `json` and `T` for `T.json`, or `assert` where members drops it
	unavailableReadOf(
		node: Node,
		module: SourceModule,
		lacked: ReadonlySet<string>
	): [read: string | undefined, object: Node, isUnsure?: true] | undefined {
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
		// a validator prints its expression as its string
		if (read === "toString" && !lacked.has(read)) read = "expression"
		const object = objects.find(object => isOnlyType(kindOf(object)))
		// e.g. `t.or` or `${t}`, where `t` may be a Type
		const unsure =
			!object &&
			(node.type === "MemberExpression" || typeof read === "string") &&
			objects.find(object => isUnsureRead(read, kindOf(object), lacked))
		if (unsure) return [read as string, unsure, true]
		return (
				object &&
					(read === undefined ||
						(typeof read === "string" &&
							(!isValidatorMember(read) || lacked.has(read))))
			) ?
				[read, object]
			:	undefined
	}

	// e.g. `JSON.stringify(T)`, `Object.keys(T)`, `{ ...T }`
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
		// e.g. `${T}` or `"" + T`, which convert it to its string
		if (
			node.type === "TemplateLiteral" &&
			node.parent?.type !== "TaggedTemplateExpression"
		)
			return ["toString", node.expressions]
		if (node.type === "BinaryExpression" && node.operator === "+")
			return ["toString", [node.left, node.right]]
		if (node.type === "AssignmentExpression" && node.operator === "+=")
			return ["toString", [node.right]]
		if (node.type === "BinaryExpression" && node.operator === "in") {
			const key = node.left.type === "Literal" ? node.left.value : undefined
			// e.g. `"and" in T`, which a validator answers with a throwing member
			return (
					typeof key === "string" &&
						(key in typeMemberKinds || includes(introspectionMembers, key))
				) ?
					undefined
				:	[key, [node.right]]
		}
		if (node.type !== "CallExpression") return
		const callee = unwrapChain(node.callee)
		const args = node.arguments.filter(arg => arg.type !== "SpreadElement")
		if (
			callee.type === "Identifier" &&
			callee.name === "String" &&
			!module.scopes.byId.get(callee)?.binding
		)
			return ["toString", args.slice(0, 1)]
		if (callee.type !== "MemberExpression") return
		const global = unwrapChain(callee.object)
		if (global.type !== "Identifier" || module.scopes.byId.get(global)?.binding)
			return
		const name = memberNameOf(callee)
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

	// e.g. `T.assert` in `T.assert(x)` or `type.errors`
	leavesArk(node: Node, module: SourceModule): boolean {
		for (;;) {
			const [operand, operator] = operatorOf(node)
			if (operator?.type !== "MemberExpression" || operator.object !== operand)
				return false
			if (!isArk(this.kindOf(operator, module))) return true
			node = operator
		}
	}

	// e.g. `getPlaces().type`, which a precompiled Scope lacks, or `.params`,
	// which a precompiled Generic lacks
	scopeReadOf(
		node: Node,
		module: SourceModule
	): [read: string, kind: StandInKind] | undefined {
		if (node.type !== "MemberExpression") return
		const name = memberNameOf(node)
		if (typeof name !== "string" || name in typeMemberKinds) return
		const kind =
			name in scopeMembers ? "Scope"
			: name in genericMembers ? "Generic"
			: undefined
		return (
				kind &&
					mayBeOtherArk(this.kindOf(node.object, module)) &&
					!this.isArktypeImport(node.object, module)
			) ?
				[name, kind]
			:	undefined
	}

	// e.g. `type` or `ark` in `import * as ark from "arktype"`
	private isArktypeImport(node: Node, module: SourceModule): boolean {
		if (this.arkExportNameOf(node, module)) return true
		const binding =
			node.type === "Identifier" ?
				module.scopes.byId.get(node)?.binding
			:	undefined
		if (binding?.kind !== "import") return false
		const target = this.importOf(binding, module).kind
		return target === "arktype" || target === "arktypeNamespace"
	}

	// e.g. `() => scope(...)` passed to a function the build doesn't analyze,
	// so it can't see what's read off the value. A held value, like `[$]`,
	// holds it, so what's read off one may be it. Importers check an export
	// whose value they can read.
	reachesUnseen(
		node: Node,
		module: SourceModule,
		isReadable: (exported: ImportTarget) => boolean,
		held = false
	): boolean {
		return this.reaches(node, module, held, {
			exact: new Set(),
			held: new Set(),
			isReadable
		})
	}

	private reaches(
		node: Node,
		module: SourceModule,
		held: boolean,
		reach: Reach
	): boolean {
		const seen = held ? reach.held : reach.exact
		if (seen.has(node)) return false
		seen.add(node)
		const follow = (next: Node, nextHeld = held) =>
			this.reaches(next, module, nextHeld, reach)
		const [operand, operator] = operatorOf(node)
		switch (operator?.type) {
			case "MemberExpression": {
				if (operator.object !== operand || isWriteTarget(operator)) return false
				// a read off what may be a Scope is checked by scopeReadOf
				if (!held) return !mayBeOtherArk(this.kindOf(operand, module))
				const kind = this.kindOf(operator, module)
				return (
					(mayBeOtherArk(kind) && follow(operator, false)) ||
					(mayHoldArk(kind) && follow(operator))
				)
			}
			case "CallExpression":
			case "NewExpression": {
				if (operator.callee === operand) return held
				const fn = this.functionOf(operator.callee, module)
				if (fn?.[1] !== module) return true
				// e.g. `hand($)` with `hand = s => each(s)`
				const param = runtimeParamsOf(fn[0])[
					operator.arguments.indexOf(operand as never)
				]
				return (
					param?.type !== "Identifier" ||
					this.readsReachUnseen(
						module.scopes.bindingsById.get(param),
						module,
						held,
						reach
					)
				)
			}
			case "ConditionalExpression":
			case "LogicalExpression":
				return (
					(operator.type === "LogicalExpression" ||
						operator.test !== operand) &&
					follow(operator)
				)
			case "SequenceExpression":
				return (
					operator.expressions[operator.expressions.length - 1] === operand &&
					follow(operator)
				)
			case "AwaitExpression":
				return follow(operator)
			case "ArrowFunctionExpression":
				return (
					operator.body === operand &&
					this.returnReachesUnseen(operator, module, held, reach)
				)
			case "ReturnStatement": {
				const fn = enclosingFunctionOf(operator)
				return !!fn && this.returnReachesUnseen(fn, module, held, reach)
			}
			case "VariableDeclarator":
				return (
					operator.id.type !== "Identifier" ||
					this.readsReachUnseen(
						module.scopes.bindingsById.get(operator.id),
						module,
						held,
						reach
					)
				)
			// e.g. `s = $`, after which reading `s` reads the Scope
			case "AssignmentExpression":
				return (
					operator.left !== operand &&
					(operator.left.type !== "Identifier" ||
						this.readsReachUnseen(
							module.scopes.byId.get(operator.left)?.binding,
							module,
							held,
							reach
						) ||
						follow(operator))
				)
			case "Property":
				return operator.value === operand && follow(operator.parent!, true)
			case "ArrayExpression":
				return follow(operator, true)
			// e.g. `[...list]`, holding what `list` holds, or `{ ...$ }`, which
			// copies what a precompiled Scope lacks
			case "SpreadElement":
				return (
					!held ||
					(operator.parent!.type !== "ArrayExpression" &&
						operator.parent!.type !== "ObjectExpression") ||
					follow(operator.parent!)
				)
			// e.g. `"type" in $`
			case "BinaryExpression":
				return operator.operator === "in" && operator.right === operand
			case "ExportDefaultDeclaration":
				return !reach.isReadable({ kind: "expression", module, node: operand })
			// e.g. `typeof $`, or `export { $ }`, checked as its binding is
			case "ExportSpecifier":
			case "ExpressionStatement":
			case "UnaryExpression":
			case "TemplateLiteral":
			case "IfStatement":
			case "SwitchStatement":
			case "SwitchCase":
			case "WhileStatement":
			case "DoWhileStatement":
			case "ForStatement":
			case "TSTypeQuery":
			case undefined:
				return false
		}
		// e.g. thrown, yielded, held by a class field or iterated
		return true
	}

	private readsReachUnseen(
		binding: Binding | undefined,
		module: SourceModule,
		held: boolean,
		reach: Reach
	): boolean {
		return (
			!binding ||
			(!!binding.exportNames.length &&
				!reach.isReadable({
					kind: "binding",
					module,
					binding,
					name: binding.exportNames[0]
				})) ||
			binding.references.some(
				reference =>
					!reference.isWrite && this.reaches(reference.id, module, held, reach)
			)
		)
	}

	// an importer can't read what an exported function returns
	private returnReachesUnseen(
		fn: FunctionNode,
		module: SourceModule,
		held: boolean,
		reach: Reach
	): boolean {
		if (bindingOfFunction(fn, module)?.exportNames.length) return true
		const calls = this.callsOf(fn, module)
		return !calls || calls.some(call => this.reaches(call, module, held, reach))
	}

	// e.g. `o.a = 1`, `list.push(x)`, `Object.assign(o, x)` or a helper doing
	// so for `o` or `list`, changing what a binding holds without assigning it
	writesThrough(binding: Binding, module: SourceModule): Node[] {
		let result = this.writesByBinding.get(binding)
		if (!result) {
			result = []
			this.writesByBinding.set(binding, result)
			for (const reference of binding.references) {
				if (reference.isWrite) continue
				const write = this.writeFrom(reference.id, module)
				if (write) result.push(write)
			}
			// e.g. `static { this.T = User }`, writing its class
			if (binding.kind === "class") {
				walk(binding.declaration, node => {
					if (
						node.type === "MemberExpression" &&
						unwrapChain(node.object).type === "ThisExpression" &&
						staticOwnerOf(node) === binding.declaration &&
						isWriteTarget(node)
					)
						result!.push(writeOf(node))
					return true
				})
			}
		}
		return result
	}

	// the write a read of an object starts through its members or aliases
	private writeFrom(node: Node, module: SourceModule): Node | undefined {
		for (;;) {
			const [operand, parent] = operatorOf(node)
			switch (parent?.type) {
				case "MemberExpression": {
					if (parent.object !== operand) return
					if (isWriteTarget(parent)) return writeOf(parent)
					const [callee, call] = operatorOf(parent)
					if (
						call?.type === "CallExpression" &&
						call.callee === callee &&
						(memberNameOf(parent) as never) in mutatingMethods
					)
						return call
					// e.g. `o.a.b = 1`, writing what `o` holds
					node = parent
					continue
				}
				case "CallExpression": {
					const index = parent.arguments.indexOf(operand as never)
					if (index === -1) return
					if (index === 0 && isObjectWrite(parent.callee, module)) return parent
					// e.g. `addB(o)` with `addB = o => { o.b = "number" }`
					const fn = this.functionOf(parent.callee, module)
					const param = fn && runtimeParamsOf(fn[0])[index]
					const written =
						fn &&
						param?.type === "Identifier" &&
						fn[1].scopes.bindingsById.get(param)
					return written && this.writesThrough(written, fn![1]).length ?
							parent
						:	undefined
				}
				// e.g. `const alias = o`, through which the program writes `o`
				case "VariableDeclarator": {
					const alias =
						parent.init === operand && parent.id.type === "Identifier" ?
							module.scopes.bindingsById.get(parent.id)
						:	undefined
					return alias && this.writesThrough(alias, module)[0]
				}
				// e.g. `for (const field of fields) field.x = 1`
				case "ForOfStatement": {
					const declaration = parent.left
					const id =
						(
							parent.right === operand &&
							declaration.type === "VariableDeclaration" &&
							declaration.declarations[0].id.type === "Identifier"
						) ?
							declaration.declarations[0].id
						:	undefined
					const element = id && module.scopes.bindingsById.get(id)
					return element && this.writesThrough(element, module)[0]
				}
				case "ConditionalExpression":
				case "LogicalExpression":
					node = parent
					continue
				default:
					return
			}
		}
	}

	// e.g. `text` for `text(50)`, imported or read off a namespace
	functionOf(
		callee: Node,
		module: SourceModule
	): [FunctionNode, SourceModule] | undefined {
		callee = unwrapChain(callee)
		if (isFunctionNode(callee)) return [callee, module]
		if (callee.type === "Identifier") {
			const binding = module.scopes.byId.get(callee)?.binding
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
		const fn = value && namedFunctionOf(unwrapChain(value.node), value.module)
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
				namedFunctionOf(unwrapChain(target.node), target.module)
			return fn && isFunctionNode(fn) ? [fn, target.module] : undefined
		}
		const fn = functionOfBinding(binding, module)
		return fn && [fn, module]
	}

	// e.g. a Type, a literal holding one, or a function returning one
	definesArk(
		target: Extract<ImportTarget, { kind: "binding" | "expression" }>
	): boolean {
		const { module } = target
		let fn: readonly [FunctionNode, SourceModule] | undefined
		if (target.kind === "binding") {
			if (isArk(this.bindingKindOf(target.binding, module))) return true
			fn = this.boundFunctionOf(target.binding, module)
		} else {
			const node = unwrapChain(target.node)
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
			(!!fn && isArk(this.finalKindOfKey(...fn)))
		)
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

// e.g. `a` for `x` in `{ a: x }`, or 1 in `[, x]`
const keyIn = (owner: Node, node: Node): unknown =>
	owner.type === "Property" ? keyNameOf(owner)
	: owner.type === "ArrayPattern" ? owner.elements.indexOf(node as never)
	: undefined

// e.g. `type(A, "|", B)`, as only `type("<t>", def)` makes a Generic
const definesType = (call: CallExpression): boolean => {
	if (call.arguments.some(arg => arg.type === "SpreadElement")) return false
	const [first, ...rest] = call.arguments
	return (
		rest.length !== 1 ||
		first.type === "ObjectExpression" ||
		first.type === "ArrayExpression" ||
		(first.type === "Literal" && !/^<.*>$/.test(String(first.value)))
	)
}

// e.g. `t.or` where `t` may be a Type, but not `list.map`. Off a value the
// build has no source for, like `res.json`, only what composes a Type or a
// build drops is read
const isUnsureRead = (
	read: unknown,
	kind: KindBits,
	lacked: ReadonlySet<string>
): boolean =>
	typeof read === "string" &&
	(read in typeMemberKinds || lacked.has(read)) &&
	(kind & kinds.type ? !isOnlyType(kind)
	: kind & kinds.unknown ? !isContainerMethod(read)
	: !!(kind & kinds.opaque) &&
		!isContainerMethod(read) &&
		!includes(introspectionMembers, read))

// e.g. `in`, which reads a Type off any Type
export const isTypeOnlyMember = (name: PropertyKey): boolean =>
	typeof name === "string" && typeMemberKinds[name] === kinds.type

// e.g. `or`, which a value the build can't see may read off a Type
export const isTypeMemberRead = (
	read: string,
	lacked: ReadonlySet<string>
): boolean =>
	(read in typeMemberKinds || lacked.has(read)) && !isContainerMethod(read)

// e.g. `or`, which returns a Type built from the one it's read off
export const isComposingMember = (name: string): boolean =>
	typeMemberKinds[name] === typeMethod

const isContainerMethod = (name: unknown): boolean =>
	typeof name === "string" && (name in Array.prototype || name in Map.prototype)

// an annotation narrows only what the build lost track of
const annotate = (kind: KindBits, annotated: KindBits | undefined): KindBits =>
	annotated === undefined ? kind : (
		(kind & arkBits) | (kind & ~arkBits ? annotated : 0)
	)

// the class `this` refers to in its static method, field or block
const staticOwnerOf = (node: Node): Node | undefined => {
	const owner = ownerOf(node)
	if (!owner || owner.type === "ObjectExpression") return
	let element = node
	while (element.parent!.type !== "ClassBody") element = element.parent!
	return (
			element.type === "StaticBlock" || ("static" in element && element.static)
		) ?
			owner
		:	undefined
}

// the class or object literal `this` refers to
const ownerOf = (node: Node): Node | undefined => {
	for (let owner = node.parent; owner; owner = owner.parent) {
		if (owner.type === "ClassBody") return owner.parent!
		if (
			owner.type === "FunctionExpression" &&
			owner.parent?.type === "Property" &&
			owner.parent.parent?.type === "ObjectExpression"
		)
			return owner.parent.parent
	}
}

const fieldValuesByClass = new WeakMap<Node, Record<string, Node[]>>()

// what each field of a class's instances may hold
const fieldValuesOf = (cls: Node): Record<string, Node[]> => {
	const cached = fieldValuesByClass.get(cls)
	if (cached) return cached
	const result: Record<string, Node[]> = Object.create(null)
	const add = (name: unknown, ...values: Node[]) => {
		if (typeof name === "string") (result[name] ??= []).push(...values)
	}
	walk(cls, node => {
		if (node.type === "PropertyDefinition" && !node.static && node.value)
			add(keyNameOf(node), node.value)
		else if (
			node.type === "AssignmentExpression" &&
			node.left.type === "MemberExpression" &&
			node.left.object.type === "ThisExpression"
		)
			add(memberNameOf(node.left), node.right)
		else if (
			node.type === "MethodDefinition" &&
			(node.kind === "get" || node.kind === "method") &&
			!node.static
		)
			add(keyNameOf(node), node.value)
		else if (
			node.type === "CallExpression" &&
			node.callee.type === "MemberExpression" &&
			node.callee.object.type === "MemberExpression" &&
			node.callee.object.object.type === "ThisExpression" &&
			(memberNameOf(node.callee) as never) in storingMethods
		)
			add(memberNameOf(node.callee.object), ...(node.arguments as Node[]))
		// e.g. `constructor(readonly schema: Schema) {}`, its binding's id
		else if (node.type === "TSParameterProperty") {
			const id =
				node.parameter.type === "AssignmentPattern" ?
					node.parameter.left
				:	node.parameter
			if (id.type === "Identifier") add(id.name, id)
		}
		return true
	})
	fieldValuesByClass.set(cls, result)
	return result
}

const memberWritesByModule = new WeakMap<SourceModule, Record<string, Node[]>>()

// what `o.name = value` writes for each name, where `o` isn't `this`
const memberWritesOf = (module: SourceModule): Record<string, Node[]> => {
	let result = memberWritesByModule.get(module)
	if (result) return result
	const found: Record<string, Node[]> = Object.create(null)
	walk(module.program, node => {
		if (
			node.type === "AssignmentExpression" &&
			node.operator === "=" &&
			node.left.type === "MemberExpression" &&
			unwrapChain(node.left.object).type !== "ThisExpression"
		) {
			const name = memberNameOf(node.left)
			if (typeof name === "string") (found[name] ??= []).push(node.right)
		}
		return true
	})
	memberWritesByModule.set(module, (result = found))
	return result
}

const writersByGlobal: Record<string, string[]> = {
	Object: ["assign", "defineProperty", "defineProperties", "setPrototypeOf"],
	Reflect: ["set", "defineProperty", "deleteProperty", "setPrototypeOf"]
}

// e.g. `Object.assign`, when `Object` is the global
export const isObjectWrite = (callee: Node, module: SourceModule): boolean => {
	callee = unwrapExpression(callee)
	return (
		callee.type === "MemberExpression" &&
		!callee.computed &&
		callee.object.type === "Identifier" &&
		!module.scopes.byId.get(callee.object)?.binding &&
		!!writersByGlobal[callee.object.name]?.includes(callee.property.name)
	)
}

// the assignment, update or `delete` a target is part of
export const writeOf = (target: Node): Node => {
	const parent = target.parent!
	switch (parent.type) {
		case "AssignmentExpression":
		case "UpdateExpression":
		case "UnaryExpression":
			return parent
		case "ForInStatement":
		case "ForOfStatement":
			return target
	}
	return writeOf(parent)
}

// e.g. `T extends Type` for `T` in `<T extends Type>(t: T) => t`
const typeParameterOf = (
	node: Node | null | undefined,
	name: string
): TSTypeParameter | undefined =>
	!node ? undefined : (
		("typeParameters" in node &&
			node.typeParameters?.params.find(param => param.name.name === name)) ||
		typeParameterOf(node.parent, name)
	)

// e.g. the cast in `(o as Schemas).user`
const castOf = (node: Node): Node | undefined => {
	for (; isTransparent(node); node = node.expression) {
		if (
			(node.type === "TSAsExpression" || node.type === "TSTypeAssertion") &&
			!isConstReference(node.typeAnnotation)
		)
			return node
	}
}

// `const` in `[A, B] as const`, which names no type
const isConstReference = (type: TSType): boolean =>
	type.type === "TSTypeReference" &&
	type.typeName.type === "Identifier" &&
	type.typeName.name === "const"

const arkTypesSpecifier = /^(?:arktype|@ark\/(?:type|schema))(?:\/|$)/

// e.g. `./schemas` or `~/schemas`, whose types the build reads where it
// can resolve them
const localSpecifier = /^(?:[#./~]|@\/)/

// e.g. `Scope`, whose value is one, which only a site may read
const arkTypeKindOf = (name: string): KindBits =>
	name === "Scope" || name === "Generic" ? unsure | kinds.otherArk : unsure

type LocalType = TSInterfaceDeclaration | TSTypeAliasDeclaration

// the types a standalone runtime replaces with a validator or refuses
const arkTypeNames: Record<string, 1> = Object.setPrototypeOf(
	{
		Type: 1,
		BaseType: 1,
		Module: 1,
		Generic: 1,
		Scope: 1,
		BaseRoot: 1,
		Submodule: 1,
		BoundModule: 1
	},
	null
)

// e.g. `["arktype", "Type"]` for `import type { Type } from "arktype"`
const importedNameOf = (
	module: SourceModule,
	name: string
): [specifier: string, imported: string] | undefined => {
	for (const statement of module.program.body) {
		if (statement.type !== "ImportDeclaration") continue
		for (const specifier of statement.specifiers) {
			if (specifier.local.name === name) {
				return [
					statement.source.value,
					specifier.type === "ImportSpecifier" ?
						exportNameOf(specifier.imported)
					:	"*"
				]
			}
		}
	}
}

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

// e.g. `t.describe("short")` in `{ const t = type("string"); return t.describe("short") }`
export const staticBodyOf = (fn: FunctionNode): Node | undefined => {
	if (fn.async || fn.generator || !fn.body) return
	if (fn.body.type !== "BlockStatement") return fn.body
	const statements = statementsOf(fn.body)
	const last = statements[statements.length - 1]
	return last?.type === "ReturnStatement" && !unstaticStatementOf(fn) ?
			(last.argument ?? undefined)
		:	undefined
}

// e.g. `if (max > 10)`, where a static helper declares only consts before it returns
export const unstaticStatementOf = (fn: FunctionNode): Node | undefined => {
	if (fn.body?.type !== "BlockStatement") return
	const statements = statementsOf(fn.body)
	return statements.find((statement, i) =>
		i === statements.length - 1 ?
			statement.type !== "ReturnStatement"
		:	!isDeclaredBeforeReturn(statement)
	)
}

// what a call to a static helper evaluates before its `return`
export const staticConstsOf = (fn: FunctionNode): VariableDeclarator[] =>
	fn.body?.type === "BlockStatement" ?
		fn.body.body.flatMap(statement =>
			statement.type === "VariableDeclaration" ? statement.declarations : []
		)
	:	[]

const statementsOf = (body: FunctionBody) =>
	body.body.filter(
		statement => !("directive" in statement && statement.directive)
	)

const isDeclaredBeforeReturn = (statement: Node): boolean =>
	statement.type === "VariableDeclaration" ?
		statement.kind === "const"
	:	statement.type === "TSTypeAliasDeclaration" ||
		statement.type === "TSInterfaceDeclaration"

// e.g. `{ User }` for `() => ({ User })`
const returnedOf = (fn: FunctionNode): Node | undefined =>
	isStatic(fn) ? staticBodyOf(fn) : onlyReturnOf(fn)

// e.g. `a` and `get b() {}` in `{ a, get b() {} }`, or a class's statics
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

export const functionOfBinding = (
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

// esbuild's keepNames: `__name(fn, "name")` returns `fn`
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
				!module.scopes.byId.get(defineProperty.object)?.binding
		) ?
			unwrapChain(node.arguments[0])
		:	node
}

// e.g. the statement `__name(f, "f")`
const isNamed = (node: Node, module: SourceModule): boolean =>
	node.parent?.parent?.type === "ExpressionStatement" &&
	namedFunctionOf(node.parent, module) === node

const initOf = (node: Node, module: SourceModule): Node | undefined => {
	const binding =
		node.type === "Identifier" ?
			module.scopes.byId.get(node)?.binding
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

// `arguments` aliases each parameter
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

export const arkPackageSpecifier =
	/^(arktype|@ark\/type|@ark\/schema|@ark\/util)(?:\/|$)/

// only a type-only import or export skips running its module
export const isTypeOnly = (statement: Node): boolean =>
	statement.type === "ImportDeclaration" ? statement.importKind === "type"
	: (
		statement.type === "ExportNamedDeclaration" ||
		statement.type === "ExportAllDeclaration"
	) ?
		statement.exportKind === "type"
	:	false

const constructsByModule = new WeakMap<SourceModule, boolean>()

// e.g. `new this(A)` or `new t.constructor(A)`, calling a constructor
// where its class isn't named
const constructsReflectively = (module: SourceModule): boolean => {
	let result = constructsByModule.get(module)
	if (result === undefined) {
		result = false
		walk(module.program, node => {
			if (
				(node.type === "NewExpression" &&
					unwrapExpression(node.callee).type === "ThisExpression") ||
				(node.type === "MetaProperty" && node.meta.name === "new") ||
				(node.type === "MemberExpression" &&
					memberNameOf(node) === "constructor")
			)
				result = true
			return !result
		})
		constructsByModule.set(module, result)
	}
	return result
}

const importsValuesByModule = new WeakMap<SourceModule, boolean>()

// an import a cycle can reach this module's exports through
export const importsValues = (module: SourceModule): boolean => {
	let result = importsValuesByModule.get(module)
	if (result === undefined) {
		result = module.program.body.some(statement => {
			const specifier = "source" in statement && statement.source?.value
			return (
				!!specifier &&
				!arkPackageSpecifier.test(specifier) &&
				!isTypeOnly(statement)
			)
		})
		importsValuesByModule.set(module, result)
	}
	return result
}

// e.g. `export function f() {}`, which is set before the module's body runs
export const isCallableBeforeBody = (fn: Node, module: SourceModule): boolean =>
	fn.type === "FunctionDeclaration" &&
	(fn.parent?.type === "ExportNamedDeclaration" ||
		fn.parent?.type === "ExportDefaultDeclaration" ||
		(fn.parent?.type === "Program" &&
			!!bindingOfFunction(fn, module)?.exportNames.length)) &&
	importsValues(module)

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

const stepsByModule = new WeakMap<SourceModule, Map<Node, number>>()

// each top-level statement or declarator, numbered from 1
export const stepsOf = (module: SourceModule): Map<Node, number> => {
	let result = stepsByModule.get(module)
	if (!result) {
		stepsByModule.set(module, (result = new Map()))
		for (const statement of module.program.body) {
			const declaration =
				(
					(statement.type === "ExportNamedDeclaration" ||
						statement.type === "ExportDefaultDeclaration") &&
					statement.declaration
				) ?
					statement.declaration
				:	statement
			if (declaration.type !== "VariableDeclaration")
				result.set(statement, result.size + 1)
			else {
				for (const declarator of declaration.declarations)
					result.set(declarator, result.size + 1)
			}
		}
	}
	return result
}

// from 1, as a module's progress is 0 until it has run a step
export const progressOf = (binding: Binding, module: SourceModule): number => {
	const steps = stepsOf(module)
	let node: Node = binding.declaration
	while (!steps.has(node)) node = node.parent!
	return steps.get(node)!
}

// e.g. not `a` in `const { a, b = f() } = x`, as `f` can read it early
export const isSetLast = (binding: Binding): boolean => {
	const declarator = binding.declaration
	if (declarator.type !== "VariableDeclarator") return true
	for (
		let node: Node = binding.id;
		node !== declarator.id;
		node = node.parent!
	) {
		const pattern = node.parent!
		const entries =
			pattern.type === "ObjectPattern" ? pattern.properties
			: pattern.type === "ArrayPattern" ? pattern.elements
			: undefined
		if (entries && entries[entries.length - 1] !== node) return false
	}
	return true
}

// the variable a site initializes, which a bundler may drop with it
export const initializedOf = (node: Node): VariableDeclarator | undefined => {
	// e.g. `type({ ... }) satisfies Type<Data>`, which runs as its expression
	while (
		node.parent &&
		isTransparent(node.parent) &&
		node.parent.expression === node
	)
		node = node.parent
	const declarator = node.parent
	return declarator?.type === "VariableDeclarator" && declarator.init === node ?
			declarator
		:	undefined
}

// a statement's first variable, so nothing it runs precedes its site
export const declarationStartOf = (node: Node): number | undefined => {
	const declarator = initializedOf(node)
	const declaration = declarator?.parent
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

export const contains = (outer: Span, inner: Span): boolean =>
	outer.start <= inner.start && inner.end <= outer.end

// e.g. `id` in `(id: string) => type({ id: "string" }).pipe(...)`
export const readsBindingOf = (
	outer: Node,
	node: Node,
	module: SourceModule
): boolean => {
	let result = false
	walk(node, child => {
		const scope =
			child.type === "Identifier" ?
				module.scopes.byId.get(child)?.binding?.scope.node
			:	undefined
		if (scope && contains(outer, scope) && !contains(node, scope)) result = true
		return !result
	})
	return result
}
