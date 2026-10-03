import {
	defineLazily,
	DynamicFunction,
	flatMorph,
	hasDomain,
	includes,
	isArray,
	isThunk,
	ParseError,
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
import { Alias, resolveShallowAliases } from "./roots/alias.ts"
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
	allowsInContext,
	allowsUntracked,
	applyCyclic,
	TransformErrors,
	Traversal,
	type TraversalKind,
	type TraverseAllows,
	type TraverseApply,
	type TraverseTransform
} from "./shared/traversal.ts"
import {
	arkKind,
	hasArkKind,
	inProgress,
	isNode,
	isResolutionFinal
} from "./shared/utils.ts"
import {
	assertUncheckedDefaultsAssignable,
	discardUncheckedDefaults
} from "./structure/optional.ts"

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
	scopesWithUnknownUnion.add($)
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

// held apart from each scope, which may be frozen before its first parse
const scopesWithUnknownUnion = new WeakSet<BaseScope>()

const rootScopeFnName = "function $"

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
		members: []
	}
	for (const node of references) linkage.referencesById.set(node.id, node)
	const declared: BaseNode[] = []
	for (const node of references) {
		if (node.isReusableLeaf && isLeafIn(node, linkage.referencesById))
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
	const compiledTraversals = unit.compile()(
		[...linkage.dependencies.keys()],
		[...linkage.refs.keys()],
		linkage.errorContexts
	)

	for (let i = 0; i < declared.length; i++) {
		const node = declared[i]
		if (node.precompilation && (!owningScope || node.$ !== owningScope)) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			continue
		}
		const [traverseAllows, traverseApply, traverseTransform] =
			compiledTraversals[i]
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
		if (node.isRoot()) {
			node.rootApply = (data, onFail) =>
				(node.rootApply = compileRootApply(node))(data, onFail)
		}
		node.isReusableLeaf = isLeafIn(node, linkage.referencesById)
	}

	return precompilation
}

// compiled traversal reports -0 as 0
const reportsDifferentlyCompiled = (node: BaseNode): boolean => {
	for (const k in node.inner)
		if (Object.is((node.inner as Dict)[k], -0)) return true
	return false
}

// createRootApply's statements, compiled per root so V8 can inline its calls
const compileRootApply = (node: BaseRoot): BaseRoot["rootApply"] => {
	const fallback =
		node.includesAlias ?
			[`return applyCyclic("${node.id}", apply, data, config).finalize(onFail)`]
		:	[
				"const ctx = new Traversal(data, config)",
				"apply(data, ctx)",
				"return ctx.finalize(onFail)"
			]
	// a valid result is returned last, as V8 weighs a return by its offset when optimizing
	const unlessInvalid = (result: string[], allowed = "allows(data)") => [
		`if (!${allowed}) {`,
		...fallback.map(line => `    ${line}`),
		"}",
		...result
	]
	const body =
		node.rootApplyStrategy === "allows" ? unlessInvalid(["return data"])
		: node.rootApplyStrategy === "contextualTransform" && node.includesAlias ?
			[
				"const untracked = allowsUntracked(node, data)",
				...unlessInvalid(
					[
						"const ctx = new Traversal(data, config)",
						"ctx.tracksTransforms = untracked === undefined",
						`const result = ctx.transformResolution("${node.id}", data, transform)`,
						"return ctx.hasError() ? ctx.finalize(onFail) : result"
					],
					"(untracked ?? allowsInContext(node, data, config))"
				)
			]
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
				"const result = transform(data, ctx)",
				"return ctx.hasError() ? ctx.finalize(onFail) : result"
			])
		:	fallback
	return new DynamicFunction<(...args: unknown[]) => BaseRoot["rootApply"]>(
		"node",
		"allows",
		"apply",
		"transform",
		"Traversal",
		"TransformErrors",
		"applyCyclic",
		"allowsUntracked",
		"allowsInContext",
		"config",
		`return (function ${node.id}RootApply(data, onFail) {\n    ${body.join("\n    ")}\n})`
	)(
		node,
		node.allows,
		node.traverseApply,
		node.traverseTransform,
		Traversal,
		TransformErrors,
		applyCyclic,
		allowsUntracked,
		allowsInContext,
		node.$.resolvedConfig
	)
}

export type PrecompiledReferences = {
	[k: `${string}Allows`]: TraverseAllows
	[k: `${string}Apply`]: TraverseApply
	[k: `${string}Optimistic`]: (data: unknown) => unknown
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
	const traversals = references.map(node => declareTraversals(linkage, node))
	for (let i = 0; i < linkage.reached.length; i++)
		declareTraversals(linkage, linkage.reached[i])
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
	for (const [name, source] of linkage.members) unit.const(name, source)
	return unit.return(`[${traversals.join(", ")}]`)
}

type UnitMember = [name: string, source: string]

const declareTraversals = (linkage: UnitLinkage, node: BaseNode): string => {
	const traversals = [
		declareTraversal(linkage, node, "Allows"),
		declareTraversal(linkage, node, "Apply")
	]
	// a prop or index signature is transformed by its structure
	if (node.transforms && includes(transformedKinds, node.kind))
		traversals.push(declareTraversal(linkage, node, "Transform"))
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
	members: UnitMember[]
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
		if (!reference) {
			if (isNode(node)) {
				this.linkage.referencesById.set(id, node)
				this.linkage.reached.push(node)
			}
		} else if (this.linkage.reused.has(reference)) {
			const kind = opts?.kind ?? this.traversalKind
			this.linkage.dependencies.set(
				reference[`traverse${kind}`],
				this.referenceToId(id, { kind })
			)
		} else if (this.linkage.unreached.delete(reference))
			this.linkage.reached.push(reference)
		return super.invoke(node, opts)
	}
}

const transformedKinds = [
	"alias",
	"intersection",
	"morph",
	"sequence",
	"structure",
	"union"
] as const satisfies NodeKind[]

const declareTraversal = (
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
	linkage.members.push([name, js.write("function")])
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

	lazilyResolve(
		resolve: () => BaseRoot,
		reference: string = registerNodeId("synthetic"),
		operator?: string,
		operands?: readonly BaseRoot[]
	): Alias.Node {
		return this.node(
			"alias",
			operator && operands ?
				{ reference, resolve, operator, operands }
			:	{ reference, resolve },
			{ prereduced: true }
		)
	}

	schema: InternalSchemaParser = (schema, opts) =>
		this.finalize(this.parseSchema(schema, opts))

	parseSchema: InternalSchemaParser = (schema, opts) =>
		this.node(schemaKindOf(schema), schema, opts)

	// an alias belongs in a structural value, so a value holding one elsewhere is deferred to an alias of its own
	parseStructuralValue(schema: RootSchema, opts?: BaseParseOptions): BaseRoot {
		const node = this.parseSchema(schema, opts)
		if (!node.includesShallowAlias || node.hasKind("alias")) return node
		nodesByRegisteredId[node.id] = node
		return this.node("alias", { reference: node.id }, { prereduced: true })
	}

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
				reference.$ === this || reference.hasKind("alias") ?
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
						reference.hkt,
						reference.alias
					) as never)
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

	private aliasOf(context: BaseParseContext): Alias.Node {
		const alias = this.node(
			"alias",
			{ reference: context.id },
			{ prereduced: true }
		)
		if (!context.closesCycle) alias.closesCycle = false
		return alias
	}

	private resolveContext(
		name: string,
		context: BaseParseContext,
		node: BaseRoot
	): BaseRoot {
		if (context.isReferencedById) {
			node = withId(node, context.id)
			nodesByRegisteredId[context.id] = node
		} else delete nodesByRegisteredId[context.id]
		return (this.resolutions[name] = node)
	}

	// a definition holding an alias outside a structural value is rebuilt from the alias's resolution once no definition is open
	private resolvePending(name: string, pending: BaseRoot): BaseRoot {
		if (inProgress.definitions)
			return this.node("alias", { reference: pending.id }, { prereduced: true })
		const context = nodesByRegisteredId[pending.id] as BaseParseContext
		inProgress.resolutions++
		try {
			let node = resolveShallowAliases(pending)
			if (context.isReferencedById) {
				node = withId(node, pending.id)
				nodesByRegisteredId[pending.id] = node
			} else delete nodesByRegisteredId[pending.id]
			return (this.resolutions[name] = node)
		} finally {
			inProgress.resolutions--
		}
	}

	maybeResolve(name: string): Exclude<CachedResolution, string> | undefined {
		const cached = this.resolutions[name]
		if (cached) {
			if (typeof cached !== "string") {
				if (hasArkKind(cached, "root") && cached.includesShallowAlias)
					return this.resolvePending(name, cached)
				return this.bindReference(cached)
			}

			const v = nodesByRegisteredId[cached]
			if (hasArkKind(v, "root")) return (this.resolutions[name] = v)
			if (hasArkKind(v, "context")) {
				if (v.phase === "resolving" || v.phase === "member") {
					reach(v)
					if (v.phase === "resolving") v.closesCycle = true
					return this.aliasOf(v)
				}
				if (v.phase === "resolved") {
					return throwInternalError(
						`Unexpected resolved context for was uncached by its scope: ${printable(v)}`
					)
				}
				v.phase = "resolving"
				v.index = v.lowlink = openDefinitions.push(v) - 1
				const membersStart = openMembers.length
				let node: BaseRoot
				try {
					node = this.parseOpenDefinition(v.def, v)
				} finally {
					openDefinitions.pop()
				}
				reach(v)
				if (v.lowlink < v.index && !node.includesShallowAlias) {
					v.phase = "member"
					v.resolution = node
					openMembers.push(v)
					return this.aliasOf(v)
				}
				v.phase = "resolved"
				inProgress.resolutions++
				let resolution: BaseRoot
				try {
					// it reaches no definition still open, so its component closes with it
					if (v.lowlink === v.index) {
						for (const member of openMembers.splice(membersStart)) {
							member.phase = "resolved"
							member.$.resolveContext(member.alias!, member, member.resolution!)
							delete member.resolution
						}
					}
					resolution =
						node.includesShallowAlias ?
							this.resolvePending(
								name,
								(this.resolutions[name] = withId(node, v.id))
							)
						:	this.resolveContext(name, v, node)
				} finally {
					inProgress.resolutions--
				}
				assertUncheckedDefaultsAssignable()
				return resolution
			}
			return throwInternalError(
				`Unexpected nodesById entry for ${cached}: ${printable(v)}`
			)
		}
		let def: unknown = this.aliases[name] ?? this.ambient?.[name]

		if (!def) return this.maybeResolveSubalias(name)

		def = this.normalizeRootScopeValue(def)

		if (hasArkKind(def, "generic")) {
			const generic = (this.resolutions[name] = this.bindReference(def))
			generic.alias ??= name
			// instantiated once cached, so its errors surface here and its body can reference it
			void generic.baseInstantiation
			return generic
		}

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
		if (!scopesWithUnknownUnion.has(this)) cacheUnknownUnion(this)
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

			this._exportedResolutions = resolutionsOfModule(this, this._exports)

			this._json = resolutionsToJson(this._exportedResolutions)
			Object.assign(this.resolutions, this._exportedResolutions)

			for (const name in this._exportedResolutions) {
				const resolution = this._exportedResolutions[name]
				if (isNode(resolution))
					addReferences(this.referencesById, resolution.referencesById)
			}
			this.references = Object.values(this.referencesById)
			if (!this.lazyExports) {
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
		let node = this.parseOpenDefinition(def, ctx)
		inProgress.resolutions++
		try {
			if (node.includesShallowAlias && !inProgress.definitions)
				node = resolveShallowAliases(node)

			// if the node is recursive e.g. { box: "this" }, we need to make sure it
			// has the original id from context so that its references compile correctly
			if (node.isCyclic) node = withId(node, ctx.id)

			if (ctx.isReferencedById) nodesByRegisteredId[ctx.id] = node
			else delete nodesByRegisteredId[ctx.id]
		} finally {
			inProgress.resolutions--
		}
		assertUncheckedDefaultsAssignable()
		return node
	}

	private parseOpenDefinition(def: unknown, ctx: BaseParseContext): BaseRoot {
		// a check left from a parse that threw would read its unresolved aliases
		if (isResolutionFinal()) discardUncheckedDefaults()
		inProgress.definitions++
		try {
			return this.bindReference(this.parseOwnDefinitionFormat(def, ctx))
		} finally {
			inProgress.definitions--
		}
	}

	finalize<node extends BaseRoot>(node: node, jit = true): node {
		// an alias may reference a definition that is still being parsed,
		// e.g. Record<string, this>, so the outermost parse finalizes it
		if (
			(inProgress.definitions || inProgress.resolutions) &&
			node.includesAlias
		)
			return node

		bootstrapAliasReferences(node)
		if (!node.precompilation && !this.resolvedConfig.jitless && jit)
			precompile(node.references)
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

const openDefinitions: BaseParseContext[] = []
const openMembers: BaseParseContext[] = []

// the definition being parsed reaches context, so it belongs to the component of the shallowest definition context reaches
const reach = (context: BaseParseContext) => {
	const referencer = openDefinitions[openDefinitions.length - 1]
	if (referencer && context.lowlink! < referencer.lowlink!)
		referencer.lowlink = context.lowlink!
}

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

const importedGlobalConfig = currentGlobalConfig()

export const bootstrapRootScope = (parseIntrinsics: () => void): void =>
	constructWith(importedGlobalConfig, () => {
		cacheUnknownUnion(rootSchemaScope)
		// ensure the scope is resolved so JIT will be applied to future types
		rootSchemaScope.export()
		parseIntrinsics()
	})

export const parseAsSchema = (
	def: unknown,
	opts?: BaseParseOptions
): BaseRoot | ParseError => {
	try {
		return rootSchema(def as RootSchema, opts) as never
	} catch (e) {
		if (e instanceof ParseError) return e
		throw e
	}
}

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
