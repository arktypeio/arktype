import {
	defineLazily,
	DynamicFunction,
	flatMorph,
	hasDomain,
	isArray,
	includes,
	isThunk,
	printable,
	throwInternalError,
	throwParseError,
	WeakCache,
	type Dict,
	type Fn,
	type Hkt,
	type JsonStructure,
	type anyOrNever,
	type array,
	type conform,
	type flattenListable,
	type intersectUnion,
	type listable,
	type noSuggest,
	type satisfy,
	type show
} from "@ark/util"
import {
	mergeConfigs,
	type ArkSchemaConfig,
	type ResolvedConfig
} from "./config.ts"
import {
	GenericRoot,
	LazyGenericBody,
	type GenericRootParser
} from "./generic.ts"
import { bootstrap } from "./intrinsic.ts"
import {
	nodeImplementationsByKind,
	type NodeSchema,
	type RootSchema,
	type nodeOfKind,
	type reducibleKindOf
} from "./kinds.ts"
import {
	RootModule,
	bindModule,
	type InternalModule,
	type PreparsedNodeResolution,
	type SchemaModule,
	type instantiateRoot
} from "./module.ts"
import type { BaseNode } from "./node.ts"
import {
	nodesByRegisteredId,
	parseNode,
	registerNodeId,
	schemaKindOf,
	withId,
	type AttachedParseContext,
	type BaseParseContext,
	type BaseParseContextInput,
	type BaseParseOptions,
	type NodeId,
	type NodeParseContext,
	type NodeParseContextInput
} from "./parse.ts"
import { Alias } from "./roots/alias.ts"
import type { BaseRoot } from "./roots/root.ts"
import type { UnionNode } from "./roots/union.ts"
import {
	CompiledFunction,
	NodeCompiler,
	type InvokeOptions
} from "./shared/compile.ts"
import type { NodeKind, RootKind } from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import {
	TransformErrors,
	Traversal,
	type TraversalKind,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "./shared/traversal.ts"
import { arkKind, hasArkKind, isNode } from "./shared/utils.ts"

export type InternalResolutions = Record<string, InternalResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type resolvableReferenceIn<$> = {
	[k in keyof $]: k extends string ?
		k extends PrivateDeclaration<infer alias> ? alias
		: // technically, root subtypes are resolvable, but there's never a good
		// reason to use them over the base alias
		k extends noSuggest | "root" ? never
		: k
	:	never
}[keyof $]

export type resolveReference<reference extends resolvableReferenceIn<$>, $> =
	reference extends keyof $ ? $[reference] : $[`#${reference}` & keyof $]

export type flatResolutionsOf<$> = show<
	intersectUnion<
		resolvableReferenceIn<$> extends infer k ?
			k extends keyof $ & string ?
				resolutionsOfReference<k, $[k]>
			:	unknown
		:	unknown
	>
>

type resolutionsOfReference<k extends string, v> =
	[v] extends [{ [arkKind]: "module" }] ?
		[v] extends [anyOrNever] ?
			{ [_ in k]: v }
		:	prefixKeys<flatResolutionsOf<v>, k> & {
				[innerKey in keyof v as innerKey extends "root" ? k
				:	never]: v[innerKey]
			}
	:	{ [_ in k]: v }

type prefixKeys<o, prefix extends string> = {
	[k in keyof o & string as `${prefix}.${k}`]: o[k]
} & unknown

export type PrivateDeclaration<key extends string = string> = `#${key}`

export type InternalResolution = BaseRoot | GenericRoot | InternalModule

export type toInternalScope<$> = BaseScope<{
	[k in keyof $]: $[k] extends { [arkKind]: infer kind } ?
		[$[k]] extends [anyOrNever] ? BaseRoot
		: kind extends "generic" ? GenericRoot
		: kind extends "module" ? InternalModule
		: never
	:	BaseRoot
}>

type CachedResolution = NodeId | BaseRoot | GenericRoot

const schemaBranchesOf = (schema: object) =>
	isArray(schema) ? schema
	: "branches" in schema && isArray(schema.branches) ? schema.branches
	: undefined

const throwMismatchedNodeRootError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)

export const writeDuplicateAliasError = <alias extends string>(
	alias: alias
): writeDuplicateAliasError<alias> =>
	`#${alias} duplicates public alias ${alias}`

export type writeDuplicateAliasError<alias extends string> =
	`#${alias} duplicates public alias ${alias}`

export type AliasDefEntry = [name: string, defValue: unknown]

// Fallback counter for anonymous scopes; scopes are identified by instance
// identity rather than names to support HMR and multi-bundle environments.
let anonymousScopeCount = 0

export type GlobalOnlyConfigOptionName = satisfy<
	keyof ArkSchemaConfig,
	"dateAllowsInvalid" | "numberAllowsNaN" | "onUndeclaredKey" | "keywords"
>

export interface ScopeOnlyConfigOptions {
	name?: string
}

export interface ArkSchemaScopeConfig
	extends Omit<ArkSchemaConfig, GlobalOnlyConfigOptionName>,
		ScopeOnlyConfigOptions {}

export interface ResolvedScopeConfig
	extends ResolvedConfig,
		ScopeOnlyConfigOptions {}

interface GlobalConfig {
	config: ArkSchemaConfig
	resolvedConfig: ResolvedConfig
}

// configure merges into $ark.config in place but replaces $ark.resolvedConfig
const currentGlobalConfig = (): GlobalConfig => ({
	config: { ...$ark.config },
	resolvedConfig: $ark.resolvedConfig
})

let fixedGlobalConfig: GlobalConfig | undefined
let constructingWith: GlobalConfig | undefined

export const fixGlobalConfig = (): void => {
	fixedGlobalConfig ??= currentGlobalConfig()
}

export const withFixedGlobalConfig = <t>(construct: () => t): t =>
	constructWith(fixedGlobalConfig, construct)

const constructWith = <t>(
	globalConfig: GlobalConfig | undefined,
	construct: () => t
): t => {
	const outerGlobalConfig = constructingWith
	constructingWith = globalConfig
	try {
		return construct()
	} finally {
		constructingWith = outerGlobalConfig
	}
}

$ark.ambient ??= {} as never

let rawUnknownUnion: UnionNode | undefined

// reduce union of all possible values reduces to unknown
const cacheUnknownUnion = ($: BaseScope): void => {
	rawUnknownUnion ??= $.node(
		"union",
		{
			branches: [
				"string",
				"number",
				"object",
				"bigint",
				"symbol",
				{ unit: true },
				{ unit: false },
				{ unit: undefined },
				{ unit: null }
			]
		},
		{ prereduced: true }
	)

	$.nodesByHash.pin(
		rawUnknownUnion.hash,
		$.node("intersection", {}, { prereduced: true })
	)
}

let constructingRootSchemaScope = true

// held apart from each scope, which may be frozen before its first parse
const scopesWithUnknownUnion = new WeakSet<BaseScope>()

const rootScopeFnName = "function $"

const reusableLeaves = new WeakSet<BaseNode>()

// leaves read no object property, so sharing them can't make an inline cache polymorphic
const isLeafIn = (
	node: BaseNode,
	referencesById: Map<string, BaseNode>
): boolean => {
	if (!node.isRoot()) return false
	for (const id in node.referencesById) {
		const reference = node.referencesById[id]
		if (
			reference !== referencesById.get(id) ||
			reference.hasKind("structure") ||
			reference.hasKind("alias")
		)
			return false
	}
	return true
}

const precompile = (
	references: readonly BaseNode[],
	owningScope?: BaseScope
): string => {
	const linkage: UnitLinkage = {
		referencesById: new Map(),
		reused: new Set(),
		unreached: new Set(),
		reached: [],
		dependencies: new Map(),
		refs: new Map(),
		errorContexts: [],
		closed: true
	}
	for (const node of references) linkage.referencesById.set(node.id, node)
	const declared: BaseNode[] = []
	for (const node of references) {
		if (reusableLeaves.has(node) && isLeafIn(node, linkage.referencesById))
			linkage.reused.add(node)
		else if (
			node.precompilation &&
			(!owningScope || node.$ !== owningScope) &&
			// compiling an alias can create nodes, so every unit declares its own
			!node.hasKind("alias")
		)
			linkage.unreached.add(node)
		else declared.push(node)
	}
	const unit = precompileReferences(declared, linkage)
	const precompilation = unit.write(rootScopeFnName)
	const traversalsByReference = unit.compile()(
		[...linkage.dependencies.keys()],
		[...linkage.refs.keys()],
		linkage.errorContexts
	)

	for (let i = 0; i < declared.length; i++) {
		const node = declared[i]
		if (node.precompilation) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			if (!owningScope || node.$ !== owningScope) continue
			reusableLeaves.delete(node)
		}
		const [traverseAllows, traverseApply, traverseTransform] =
			traversalsByReference[i]
		node.traverseAllows = traverseAllows
		if (node.isRoot() && !node.allowsRequiresContext) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = traverseAllows as never
		}
		node.traverseApply = traverseApply
		if (traverseTransform) node.traverseTransform = traverseTransform
		node.precompilation = precompilation
		// kept so an unfinalized parse can't return an uncompiled copy reporting differently
		if (reportsDifferentlyCompiled(node)) node.keepInScope()
		if (node.isRoot()) bindRootApply(node)
		if (linkage.closed && isLeafIn(node, linkage.referencesById))
			reusableLeaves.add(node)
	}

	return precompilation
}

// compiled traversal describes a discriminated union by its cases and reports -0 as 0
const reportsDifferentlyCompiled = (node: BaseNode): boolean => {
	if (node.hasKind("union")) return node.compiledDiscriminant !== null
	for (const k in node.inner)
		if (Object.is((node.inner as Dict)[k], -0)) return true
	return false
}

const bindRootApply = (node: BaseRoot) => {
	node.rootApply = (data, onFail) =>
		(node.rootApply = compileRootApply(node))(data, onFail)
}

// createRootApply's statements, compiled per root so V8 can inline its calls
const compileRootApply = (node: BaseRoot): BaseRoot["rootApply"] => {
	const fallback = [
		"const ctx = new Traversal(data, config)",
		"apply(data, ctx)",
		"return ctx.finalize(onFail)"
	]
	// a valid result is returned last, as V8 weighs a return by its offset when optimizing
	const unlessInvalid = (result: string[]) => [
		"if (!allows(data)) {",
		...fallback.map(line => `    ${line}`),
		"}",
		...result
	]
	const body =
		node.rootApplyStrategy === "allows" ? unlessInvalid(["return data"])
		: node.rootApplyStrategy === "transform" ?
			unlessInvalid(
				node.includesMorph ?
					[
						"const result = transform(data)",
						"if (result instanceof TransformErrors) {",
						"    const ctx = new Traversal(data, config)",
						"    ctx.addTransformErrors(result)",
						"    return ctx.finalize(onFail)",
						"}",
						"return result"
					]
				:	["return transform(data)"]
			)
		: node.rootApplyStrategy === "contextualTransform" ?
			unlessInvalid([
				"const ctx = new Traversal(data, config)",
				node.includesAlias ?
					`const result = ctx.transformResolution("${node.id}", data, data => transform(data, ctx))`
				:	"const result = transform(data, ctx)",
				"return ctx.hasError() ? ctx.finalize(onFail) : result"
			])
		:	fallback
	return new DynamicFunction<(...args: unknown[]) => BaseRoot["rootApply"]>(
		"allows",
		"apply",
		"transform",
		"Traversal",
		"TransformErrors",
		"config",
		`return (function ${node.id}RootApply(data, onFail) {\n    ${body.join("\n    ")}\n})`
	)(
		node.allows,
		node.traverseApply,
		node.traverseTransform,
		Traversal,
		TransformErrors,
		node.$.resolvedConfig
	)
}

type PrecompiledTraversals = [
	allows: TraverseAllows,
	apply: TraverseApply,
	transform?: TraverseTransform
]

const precompileReferences = (
	references: readonly BaseNode[],
	linkage: UnitLinkage
) => {
	const members: UnitMember[] = []
	const traversalsByReference = references.map(node =>
		declareTraversals(members, linkage, node)
	)
	for (let i = 0; i < linkage.reached.length; i++)
		declareTraversals(members, linkage, linkage.reached[i])
	// passed as arrays, since V8 can't compile a function with tens of thousands of parameters
	const unit = new CompiledFunction<
		(
			dependencies: Fn[],
			refs: unknown[],
			errorContexts: NodeCompiler.ErrorContexts
		) => PrecompiledTraversals[],
		["dependencies", "refs", "errorContexts"]
	>("dependencies", "refs", "errorContexts")
	let i = 0
	for (const name of linkage.dependencies.values())
		unit.const(name, `dependencies[${i++}]`)
	i = 0
	for (const name of linkage.refs.values()) unit.const(name, `refs[${i++}]`)
	for (const [name, source] of members) unit.const(name, source)
	return unit.return(`[${traversalsByReference.join(", ")}]`)
}

type UnitMember = [name: string, source: string]

const declareTraversals = (
	members: UnitMember[],
	linkage: UnitLinkage,
	node: BaseNode
): string => {
	const traversals = [
		declareTraversal(members, linkage, node, "Allows"),
		declareTraversal(members, linkage, node, "Apply")
	]
	// a prop or index signature is transformed by its structure
	if (node.transforms && includes(transformedKinds, node.kind))
		traversals.push(declareTraversal(members, linkage, node, "Transform"))
	return `[${traversals.join(", ")}]`
}

interface UnitLinkage {
	referencesById: Map<string, BaseNode>
	reused: Set<BaseNode>
	unreached: Set<BaseNode>
	reached: BaseNode[]
	dependencies: Map<Fn, string>
	refs: NodeCompiler.Refs
	errorContexts: NodeCompiler.ErrorContexts
	closed: boolean
}

class TraversalCompiler extends NodeCompiler {
	readonly linkage: UnitLinkage

	constructor(
		kind: TraversalKind,
		linkage: UnitLinkage,
		requiresContext: boolean
	) {
		super({
			kind,
			requiresContext,
			refs: linkage.refs,
			errorContexts: linkage.errorContexts
		})
		this.linkage = linkage
	}

	override invoke(node: BaseNode | NodeId, opts?: InvokeOptions): string {
		const id = typeof node === "string" ? node : node.id
		const reference = this.linkage.referencesById.get(id)
		if (!reference) this.linkage.closed = false
		else if (this.linkage.reused.has(reference)) {
			const kind = opts?.kind ?? this.traversalKind
			this.linkage.dependencies.set(
				traversalOf(reference, kind),
				this.referenceToId(id, { kind })
			)
		} else if (this.linkage.unreached.delete(reference))
			this.linkage.reached.push(reference)
		return super.invoke(node, opts)
	}
}

const traversalOf = (node: BaseNode, kind: TraversalKind): Fn =>
	kind === "Allows" ? node.traverseAllows
	: kind === "Apply" ? node.traverseApply
	: node.traverseTransform

const transformedKinds = [
	"alias",
	"intersection",
	"morph",
	"sequence",
	"structure",
	"union"
] as const satisfies NodeKind[]

const declareTraversal = (
	members: UnitMember[],
	linkage: UnitLinkage,
	node: BaseNode,
	kind: TraversalKind
): string => {
	const js = new TraversalCompiler(
		kind,
		linkage,
		kind !== "Transform" || node.transformRequiresContext
	).indent()
	node.compile(js)
	const name = js.referenceToId(node.id, { kind })
	members.push([name, `function ${js.write("")}`])
	return name
}

const registerParseContext = <ctx extends BaseParseContext>(ctx: ctx): ctx =>
	(nodesByRegisteredId[ctx.id] = ctx)

export abstract class BaseScope<$ extends {} = {}> {
	readonly config: ArkSchemaScopeConfig
	readonly resolvedConfig: ResolvedScopeConfig
	readonly name: string

	get [arkKind](): "scope" {
		return "scope"
	}

	readonly referencesById: { [id: string]: BaseNode } = {}
	references: readonly BaseNode[] = []
	readonly resolutions: {
		[alias: string]: CachedResolution | undefined
	} = {}

	exportedNames: string[] = []
	readonly aliases: Record<string, unknown> = {}
	resolved = false
	readonly nodesByHash: WeakCache<BaseNode> = new WeakCache(
		this.holdsNodesWeakly
	)

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkSchemaScopeConfig
	) {
		if (constructingRootSchemaScope) scopesWithUnknownUnion.add(this)

		const globalConfig = constructingWith ?? $ark

		this.config = mergeConfigs(globalConfig.config, config)

		this.resolvedConfig = mergeConfigs(globalConfig.resolvedConfig, config)

		this.name =
			this.resolvedConfig.name ?? `anonymousScope${anonymousScopeCount++}`

		const aliasEntries = Object.entries(def).map(entry =>
			this.preparseOwnAliasEntry(...entry)
		)

		for (const [k, v] of aliasEntries) {
			let name = k
			if (k[0] === "#") {
				name = k.slice(1)
				if (name in this.aliases)
					throwParseError(writeDuplicateAliasError(name))
				this.aliases[name] = v
			} else {
				if (name in this.aliases) throwParseError(writeDuplicateAliasError(k))
				this.aliases[name] = v
				this.exportedNames.push(name)
			}
			if (
				!hasArkKind(v, "module") &&
				!hasArkKind(v, "generic") &&
				!isThunk(v)
			) {
				const preparsed = this.preparseOwnDefinitionFormat(v, { alias: name })
				this.resolutions[name] =
					hasArkKind(preparsed, "root") ?
						this.bindReference(preparsed)
					:	registerParseContext(this.createParseContext(preparsed)).id
			}
		}
	}

	protected get holdsNodesWeakly(): boolean {
		return false
	}

	get intrinsic(): Omit<typeof $ark.intrinsic, `json${string}`> {
		// intrinsic won't be available during bootstrapping,  so we lie
		// about the type here as an extrnal convenience
		const bound = {} as never
		const intrinsic = $ark.intrinsic
		for (const k in intrinsic) {
			// don't include cyclic aliases from JSON scope
			if (k.startsWith("json")) continue
			defineLazily(bound, k, () =>
				this.bindReference(intrinsic[k as keyof typeof intrinsic])
			)
		}
		return this.cacheGetter("intrinsic", bound)
	}

	protected cacheGetter<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		if (Object.isExtensible(this)) Object.defineProperty(this, name, { value })
		return value
	}

	get internal(): this {
		return this
	}

	// json is populated when the scope is exported, so ensure it is populated
	// before allowing external access
	private _json: JsonStructure | undefined
	get json(): JsonStructure {
		if (!this._json) this.export()
		return this._json!
	}

	defineSchema<def extends RootSchema>(def: def): def {
		return def
	}

	generic: GenericRootParser = (...params) => {
		const $: BaseScope = this as never
		return (def: unknown, possibleHkt?: Hkt.constructor) =>
			new GenericRoot(
				params,
				possibleHkt ? new LazyGenericBody(def as Fn) : def,
				$,
				$,
				possibleHkt ?? null
			) as never
	}

	units = (values: array, opts?: BaseParseOptions): BaseRoot => {
		const uniqueValues: unknown[] = []
		for (const value of values)
			if (!uniqueValues.includes(value)) uniqueValues.push(value)

		const branches = uniqueValues.map(unit => this.node("unit", { unit }, opts))
		return this.node("union", branches, {
			...opts,
			prereduced: true
		})
	}

	protected lazyResolutions: Alias.Node[] = []
	lazilyResolve(resolve: () => BaseRoot, syntheticAlias?: string): Alias.Node {
		const node = this.node(
			"alias",
			{
				reference: syntheticAlias ?? "synthetic",
				resolve
			},
			{ prereduced: true }
		)
		if (!this.resolved) this.lazyResolutions.push(node)
		return node
	}

	schema: InternalSchemaParser = (schema, opts) =>
		this.finalize(this.parseSchema(schema, opts))

	parseSchema: InternalSchemaParser = (schema, opts) =>
		this.node(schemaKindOf(schema), schema, opts)

	protected preparseNode(
		kinds: NodeKind | listable<RootKind>,
		schema: unknown,
		opts: BaseParseOptions
	): BaseNode | NodeParseContextInput {
		let kind: NodeKind =
			typeof kinds === "string" ? kinds : schemaKindOf(schema, kinds)

		if (isNode(schema) && schema.kind === kind) return schema

		if (kind === "alias" && !opts?.prereduced) {
			const { reference } = Alias.implementation.normalize(
				schema as never,
				this
			)
			if (reference.startsWith("$")) {
				const resolution = this.resolveRoot(reference.slice(1))
				schema = resolution
				kind = resolution.kind
			}
		} else if (kind === "union" && hasDomain(schema, "object")) {
			const branches = schemaBranchesOf(schema)
			if (branches?.length === 1) {
				schema = branches[0]
				kind = schemaKindOf(schema)
			}
		}

		if (isNode(schema) && schema.kind === kind) return schema

		const impl = nodeImplementationsByKind[kind]
		const normalizedSchema = impl.normalize?.(schema, this) ?? schema

		// check again after normalization in case a node is a valid collapsed
		// schema for the kind (e.g. sequence can collapse to element accepting a Node')
		if (isNode(normalizedSchema)) {
			return normalizedSchema.kind === kind ?
					normalizedSchema
				:	throwMismatchedNodeRootError(kind, normalizedSchema.kind)
		}

		return {
			...opts,
			$: this,
			kind,
			def: normalizedSchema,
			prefix: opts.alias ?? kind
		}
	}

	bindReference<reference extends BaseNode | GenericRoot>(
		reference: reference
	): reference {
		let bound: reference

		if (isNode(reference)) {
			bound =
				reference.$ === this ?
					reference
				:	new (reference.constructor as any)(reference, this)
		} else {
			bound =
				reference.$ === this ?
					reference
				:	(new GenericRoot(
						reference.params as never,
						reference.bodyDef,
						reference.$,
						this as never,
						reference.hkt
					) as never)
		}

		if (!this.resolved) {
			// we're still parsing the scope itself, so defer compilation but
			// add the node as a reference
			Object.assign(this.referencesById, bound.referencesById)
		}

		return bound as never
	}

	resolveRoot(name: string): BaseRoot {
		return (
			this.maybeResolveRoot(name) ??
			throwParseError(writeUnresolvableMessage(name))
		)
	}

	maybeResolveRoot(name: string): BaseRoot | undefined {
		const result = this.maybeResolve(name)
		if (hasArkKind(result, "generic")) return
		return result
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	protected maybeResolveSubalias(
		name: string
	): BaseRoot | GenericRoot | undefined {
		return (
			(this.lazyExports && maybeResolveExport(this.lazyExports, name)) ??
			maybeResolveSubalias(this.aliases, name) ??
			maybeResolveSubalias(this.ambient, name)
		)
	}

	get ambient(): InternalModule {
		return $ark.ambient as never
	}

	maybeResolve(name: string): Exclude<CachedResolution, string> | undefined {
		const cached = this.resolutions[name]
		if (cached) {
			if (typeof cached !== "string") return this.bindReference(cached)

			const v = nodesByRegisteredId[cached]
			if (hasArkKind(v, "root")) return (this.resolutions[name] = v)
			if (hasArkKind(v, "context")) {
				if (v.phase === "resolving") {
					return this.node(
						"alias",
						{ reference: `$${name}` },
						{ prereduced: true }
					)
				}
				if (v.phase === "resolved") {
					return throwInternalError(
						`Unexpected resolved context for was uncached by its scope: ${printable(v)}`
					)
				}
				v.phase = "resolving"
				const node = this.bindReference(this.parseOwnDefinitionFormat(v.def, v))
				v.phase = "resolved"
				delete nodesByRegisteredId[v.id]
				return (this.resolutions[name] = node)
			}
			return throwInternalError(
				`Unexpected nodesById entry for ${cached}: ${printable(v)}`
			)
		}
		let def: unknown = this.aliases[name] ?? this.ambient?.[name]

		if (!def) return this.maybeResolveSubalias(name)

		def = this.normalizeRootScopeValue(def)

		if (hasArkKind(def, "generic"))
			return (this.resolutions[name] = this.bindReference(def))

		if (hasArkKind(def, "module")) {
			if (!def.root) throwParseError(writeMissingSubmoduleAccessMessage(name))
			return (this.resolutions[name] = this.bindReference(def.root))
		}

		return (this.resolutions[name] = this.parse(def, {
			alias: name
		}))
	}

	protected createParseContext<input extends BaseParseContextInput>(
		input: input
	): input & AttachedParseContext {
		bootstrap()
		if (!scopesWithUnknownUnion.has(this)) {
			scopesWithUnknownUnion.add(this)
			cacheUnknownUnion(this)
		}
		const id = input.id ?? registerNodeId(input.prefix)
		return Object.assign(input, {
			[arkKind]: "context" as const,
			$: this as never,
			id,
			phase: "unresolved" as const
		})
	}

	traversal(root: unknown): Traversal {
		return new Traversal(root, this.resolvedConfig)
	}

	import(): SchemaModule<{
		[k in exportedNameOf<$> as PrivateDeclaration<k>]: $[k]
	}>
	import<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		{
			[k in names[number] as PrivateDeclaration<k>]: $[k]
		} & unknown
	>
	import(...names: string[]): SchemaModule {
		return new RootModule(
			flatMorph(this.export(...(names as any)), (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	precompilation: string | undefined

	private _exportedResolutions: InternalResolutions | undefined
	private _exports: RootExportCache | undefined
	export(): SchemaModule<{ [k in exportedNameOf<$>]: $[k] }>
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<
		{
			[k in names[number]]: $[k]
		} & unknown
	>
	export(...names: string[]): SchemaModule {
		if (!this._exports) {
			this._exports = {}
			for (const name of this.exportedNames) {
				const def = this.aliases[name]
				this._exports[name] =
					this.lazyExports ? this.lazyExports[name]
					: hasArkKind(def, "module") ? bindModule(def, this)
					: bootstrapAliasReferences(this.maybeResolve(name)!)
			}

			// force node.resolution getter evaluation
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			for (const node of this.lazyResolutions) node.resolution

			this._exportedResolutions = resolutionsOfModule(this, this._exports)

			this._json = resolutionsToJson(this._exportedResolutions)
			Object.assign(this.resolutions, this._exportedResolutions)

			if (!this.lazyExports) {
				for (const name in this._exports) {
					const resolution = this._exports[name]
					if (isNode(resolution))
						addReferences(this.referencesById, resolution.referencesById)
				}
				this.references = Object.values(this.referencesById)
				if (!this.resolvedConfig.jitless)
					this.precompilation = precompile(this.references, this)
				this.resolved = true
			}
		}
		const namesToExport = names.length ? names : this.exportedNames
		return new RootModule(
			flatMorph(namesToExport, (_, name) => [
				name,
				this._exports![name]
			]) as never
		) as never
	}

	resolve<name extends exportedNameOf<$>>(
		name: name
	): instantiateRoot<$[name]> {
		return (this.lazyExports ?? this.export())[name as never]
	}

	private lazyExports: InternalModule | undefined

	exportLazily(): SchemaModule<{ [k in exportedNameOf<$>]: $[k] }> {
		if (!this.lazyExports) {
			const exports = new RootModule({})
			for (const name of this.exportedNames) {
				defineLazily(exports, name, () => {
					const def = this.aliases[name]
					return hasArkKind(def, "module") ?
							bindModuleLazily(def, this)
						:	finalizeExport(
								this,
								bootstrapAliasReferences(this.maybeResolve(name)!)
							)
				})
			}
			this.lazyExports = exports as never
			this.resolved = true
		}
		return this.lazyExports as never
	}

	node = <
		kinds extends NodeKind | array<RootKind>,
		prereduced extends boolean = false
	>(
		kinds: kinds,
		nodeSchema: NodeSchema<flattenListable<kinds>>,
		opts = {} as BaseParseOptions<prereduced>
	): nodeOfKind<
		prereduced extends true ? flattenListable<kinds>
		:	reducibleKindOf<flattenListable<kinds>>
	> => {
		const ctxOrNode = this.preparseNode(kinds, nodeSchema, opts)

		if (isNode(ctxOrNode)) return this.bindReference(ctxOrNode) as never

		const ctx = this.createParseContext(ctxOrNode)

		const node = parseNode(ctx)

		return this.bindReference(node) as never
	}

	parse = (def: unknown, opts: BaseParseOptions = {}): BaseRoot =>
		this.finalize(this.parseDefinition(def, opts))

	parseDefinition(def: unknown, opts: BaseParseOptions = {}): BaseRoot {
		if (hasArkKind(def, "root")) return this.bindReference(def)

		const ctxInputOrNode = this.preparseOwnDefinitionFormat(def, opts)
		if (hasArkKind(ctxInputOrNode, "root"))
			return this.bindReference(ctxInputOrNode)

		const ctx = registerParseContext(this.createParseContext(ctxInputOrNode))
		let node = this.bindReference(this.parseOwnDefinitionFormat(def, ctx))

		// if the node is recursive e.g. { box: "this" }, we need to make sure it
		// has the original id from context so that its references compile correctly
		if (node.isCyclic) node = withId(node, ctx.id)

		if (ctx.isReferencedById) nodesByRegisteredId[ctx.id] = node
		else delete nodesByRegisteredId[ctx.id]

		return node
	}

	finalize<node extends BaseRoot>(node: node, jit = true): node {
		// a node referencing a `this` whose enclosing type is still being parsed,
		// e.g. Record<string, this>, can't be resolved yet. the enclosing parse
		// finalizes it once the context has been replaced with the resolved node.
		if (node.isCyclic && hasUnresolvedContextAlias(node)) return node

		bootstrapAliasReferences(node)
		if (node.precompilation || this.resolvedConfig.jitless) return node
		const references = node.references
		// compiled and interpreted unions word some errors differently
		if (jit || references.some(reference => reference.hasKind("union")))
			precompile(references)
		return node
	}

	protected abstract preparseOwnDefinitionFormat(
		def: unknown,
		opts: BaseParseOptions
	): BaseRoot | BaseParseContextInput

	abstract parseOwnDefinitionFormat(
		def: unknown,
		ctx: BaseParseContext
	): BaseRoot

	protected abstract preparseOwnAliasEntry(k: string, v: unknown): AliasDefEntry

	protected abstract normalizeRootScopeValue(resolution: unknown): unknown
}

export class SchemaScope<$ extends {} = {}> extends BaseScope<$> {
	parseOwnDefinitionFormat(def: unknown, ctx: NodeParseContext): BaseRoot {
		return parseNode(ctx) as never
	}

	protected preparseOwnDefinitionFormat(
		schema: RootSchema,
		opts: BaseParseOptions
	): BaseRoot | NodeParseContextInput {
		return this.preparseNode(schemaKindOf(schema), schema, opts) as never
	}

	protected preparseOwnAliasEntry(k: string, v: unknown): AliasDefEntry {
		return [k, v]
	}

	protected normalizeRootScopeValue(v: unknown): unknown {
		return v
	}
}

const bindModuleLazily = (
	module: InternalModule,
	$: BaseScope
): InternalModule => {
	const bound = new RootModule({})
	for (const k in module) {
		defineLazily(bound, k, () => {
			const resolution = module[k]
			return hasArkKind(resolution, "module") ?
					bindModuleLazily(resolution, $)
				:	finalizeExport(
						$,
						$.bindReference(resolution as BaseRoot | GenericRoot)
					)
		})
	}
	return bound as never
}

const finalizeExport = ($: BaseScope, resolution: BaseRoot | GenericRoot) =>
	hasArkKind(resolution, "root") ? $.finalize(resolution) : resolution

const maybeResolveExport = (
	exports: InternalModule,
	name: string
): BaseRoot | GenericRoot | undefined => {
	if (!name.includes(".")) return
	let resolution: unknown = exports
	for (const k of name.split(".")) {
		if (!hasArkKind(resolution, "module")) return
		resolution = (resolution as Dict)[k]
	}
	return hasArkKind(resolution, "root") || hasArkKind(resolution, "generic") ?
			resolution
		:	undefined
}

// scope aliases are `$name` references, so can be skipped without a lookup
const hasUnresolvedContextAlias = (node: BaseRoot): boolean =>
	node.references.some(
		ref =>
			ref.hasKind("alias") &&
			ref.reference[0] !== "$" &&
			hasArkKind(nodesByRegisteredId[ref.reference as NodeId], "context")
	)

const bootstrapAliasReferences = (resolution: BaseRoot | GenericRoot) => {
	if (isNode(resolution) && !resolution.includesAlias) return resolution
	const aliases = resolution.references.filter(node => node.hasKind("alias"))
	for (const aliasNode of aliases) {
		addReferences(aliasNode.referencesById, aliasNode.resolution.referencesById)
		for (const ref of resolution.references) {
			if (aliasNode.id in ref.referencesById)
				addReferences(ref.referencesById, aliasNode.referencesById)
		}
	}
	return resolution
}

const addReferences = (
	base: BaseNode["referencesById"],
	references: BaseNode["referencesById"]
) => {
	for (const id in references) base[id] ??= references[id]
}

const resolutionsToJson = (resolutions: InternalResolutions): JsonStructure =>
	flatMorph(resolutions, (k, v) => [
		k,
		hasArkKind(v, "root") || hasArkKind(v, "generic") ? v.json
		: hasArkKind(v, "module") ? resolutionsToJson(v)
		: throwInternalError(`Unexpected resolution ${printable(v)}`)
	])

const maybeResolveSubalias = (
	base: Dict,
	name: string
): BaseRoot | GenericRoot | undefined => {
	const dotIndex = name.indexOf(".")
	if (dotIndex === -1) return

	const dotPrefix = name.slice(0, dotIndex)
	const prefixSchema = base[dotPrefix]
	// if the name includes ".", but the prefix is not an alias, it
	// might be something like a decimal literal, so just fall through to return
	if (prefixSchema === undefined) return
	if (!hasArkKind(prefixSchema, "module"))
		return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))

	const subalias = name.slice(dotIndex + 1)
	const resolution = prefixSchema[subalias]

	if (resolution === undefined)
		return maybeResolveSubalias(prefixSchema, subalias)

	if (hasArkKind(resolution, "root") || hasArkKind(resolution, "generic"))
		return resolution

	if (hasArkKind(resolution, "module")) {
		return (
			resolution.root ??
			throwParseError(writeMissingSubmoduleAccessMessage(name))
		)
	}

	throwInternalError(
		`Unexpected resolution for alias '${name}': ${printable(resolution)}`
	)
}

type instantiateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends InternalResolution ? aliases[k]
	:	BaseRoot
} & unknown

export type SchemaScopeParser = <const aliases>(
	aliases: {
		[k in keyof aliases]: conform<
			aliases[k],
			RootSchema | PreparsedNodeResolution
		>
	},
	config?: ArkSchemaScopeConfig
) => BaseScope<instantiateAliases<aliases>>

export const schemaScope: SchemaScopeParser = (aliases, config) =>
	new SchemaScope(aliases, config)

export type InternalSchemaParser = (
	schema: RootSchema,
	opts?: BaseParseOptions
) => BaseRoot

export const rootSchemaScope: SchemaScope = new SchemaScope({})

constructingRootSchemaScope = false

const importedGlobalConfig = currentGlobalConfig()

export const bootstrapRootScope = (parseIntrinsics: () => void): void =>
	constructWith(importedGlobalConfig, () => {
		cacheUnknownUnion(rootSchemaScope)
		// ensure the scope is resolved so JIT will be applied to future types
		rootSchemaScope.export()
		parseIntrinsics()
	})

export type RootExportCache = Record<
	string,
	BaseRoot | GenericRoot | RootModule | undefined
>

const resolutionsOfModule = ($: BaseScope, typeSet: RootExportCache) => {
	const result: InternalResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule($, v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "root") || hasArkKind(v, "generic")) result[k] = v
		else throwInternalError(`Unexpected scope resolution ${printable(v)}`)
	}
	return result
}

export const writeUnresolvableMessage = <token extends string>(
	token: token
): writeUnresolvableMessage<token> => `'${token}' is unresolvable`

export type writeUnresolvableMessage<token extends string> =
	`'${token}' is unresolvable`

export const writeNonSubmoduleDotMessage = <name extends string>(
	name: name
): writeNonSubmoduleDotMessage<name> =>
	`'${name}' must reference a module to be accessed using dot syntax`

export type writeNonSubmoduleDotMessage<name extends string> =
	`'${name}' must reference a module to be accessed using dot syntax`

export const writeMissingSubmoduleAccessMessage = <name extends string>(
	name: name
): writeMissingSubmoduleAccessMessage<name> =>
	`Reference to submodule '${name}' must specify an alias`

export type writeMissingSubmoduleAccessMessage<name extends string> =
	`Reference to submodule '${name}' must specify an alias`

export const rootSchema: BaseScope["schema"] = rootSchemaScope.schema
export const node: BaseScope["node"] = rootSchemaScope.node
export const defineSchema: BaseScope["defineSchema"] =
	rootSchemaScope.defineSchema
export const genericNode: BaseScope["generic"] = rootSchemaScope.generic
