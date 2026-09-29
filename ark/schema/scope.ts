import {
	DynamicFunction,
	ParseError,
	flatMorph,
	hasDomain,
	isArray,
	isThunk,
	printable,
	throwInternalError,
	throwParseError,
	unset,
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
	Traversal,
	type TraversalKind,
	type TraverseAllows,
	type TraverseApply
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
	prereducedAliases?: boolean
}

export interface ArkSchemaScopeConfig
	extends Omit<ArkSchemaConfig, GlobalOnlyConfigOptionName>,
		ScopeOnlyConfigOptions {}

export interface ResolvedScopeConfig
	extends ResolvedConfig,
		ScopeOnlyConfigOptions {}

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

	$.nodesByHash[rawUnknownUnion.hash] = $.node(
		"intersection",
		{},
		{ prereduced: true }
	)
}

// the root scope is constructed on import, when arksets (which itself imports
// @ark/schema) cannot yet have installed an engine, so it alone defers its
// shared nodes and precompilation to bootstrapRootScope
let constructingRootSchemaScope = true

const rootScopeFnName = "function $"

// roots bound by a closed unit, one that declares or is passed each traversal
// it invokes, in which they were leaves (see isLeafIn). A unit calls a
// reusable leaf's traversals rather than declaring its own.
const reusableLeaves = new WeakSet<BaseNode>()

// a leaf root reads no property of an object, since no structure or alias is
// among its references, so units calling its traversals share no inline cache
// that sees differently shaped data, as they would calling an object's. Those
// traversals invoke only its references, by id, so they are the ones a unit
// compiles for it wherever each of those ids names the same node.
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

// compiles references into one unit and binds its traversals, returning the
// unit's source. A node bound by an earlier unit keeps its traversals unless
// it belongs to owningScope, the scope being exported. A reusable leaf is not
// declared again: the unit is passed those of its traversals it invokes. Any
// other node bound by an earlier unit is declared only if a member invokes
// it, except an alias: compiling one reads its resolution, which can create
// nodes, so every unit compiles each alias among its references.
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
			!node.hasKind("alias")
		)
			linkage.unreached.add(node)
		else declared.push(node)
	}
	const unit = precompileReferences(declared, linkage)
	unit.argNames.push(...linkage.dependencies.values(), ...linkage.refs.values())
	const precompilation = unit.write(rootScopeFnName)
	const traversalsByReference = unit.compile()(
		...linkage.dependencies.keys(),
		...linkage.refs.keys()
	)

	for (let i = 0; i < declared.length; i++) {
		const node = declared[i]
		if (node.precompilation) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			if (!owningScope || node.$ !== owningScope) continue
			// owningScope rebinds it, so it stays reusable only if its new traversals are
			reusableLeaves.delete(node)
		}
		const [traverseAllows, traverseApply, traverseOptimistic] =
			traversalsByReference[i]
		node.traverseAllows = traverseAllows
		if (node.isRoot() && !node.allowsRequiresContext) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = traverseAllows as never
		}
		node.traverseApply = traverseApply
		if (traverseOptimistic)
			(node as UnionNode).traverseOptimistic = traverseOptimistic
		node.precompilation = precompilation
		if (node.isRoot()) bindRootApply(node)
		if (linkage.closed && isLeafIn(node, linkage.referencesById))
			reusableLeaves.add(node)
	}

	return precompilation
}

// a root a unit binds applies its new traversals through code of its own,
// compiled on its first call, since most roots a unit binds (nested objects,
// union branches, the keywords of each scope) are never called directly
const bindRootApply = (node: BaseRoot) => {
	node.rootApply = (data, onFail) =>
		(node.rootApply = compileRootApply(node))(data, onFail)
}

// the statements createRootApply runs for a root's rootApplyStrategy, in the
// same order, with its bound traversals as constants. Named for the root, its
// source is its own, so unlike the closures createRootApply builds from one
// literal per strategy, it shares no V8 feedback with other roots' applies:
// each call it makes has one target, which V8 can inline.
const compileRootApply = (node: BaseRoot): BaseRoot["rootApply"] => {
	const fallback = [
		"const ctx = new Traversal(data, config)",
		"apply(data, ctx)",
		"return ctx.finalize(onFail)"
	]
	// a valid result is returned last: V8 weighs a return by its offset in
	// deciding when to optimize a function, and returned first, it would leave
	// this one unoptimized for tens of thousands of calls after Maglev inlined
	// the traversals it calls, running them slower than they run on their own
	const unlessInvalid = (invalid: string, result: string) => [
		`if (${invalid}) {`,
		...fallback.map(line => `    ${line}`),
		"}",
		`return ${result}`
	]
	const body =
		node.rootApplyStrategy === "allows" ? unlessInvalid("!allows(data)", "data")
		: node.rootApplyStrategy === "optimistic" ?
			unlessInvalid(
				"!allows(data)",
				// called on the root, as createRootApply calls it
				`node.contextFreeMorph(clone && ((typeof data === "object" && data !== null) || typeof data === "function") ? clone(data) : data)`
			)
		: node.rootApplyStrategy === "branchedOptimistic" ?
			[
				"const optimisticResult = optimistic(data)",
				...unlessInvalid(`optimisticResult === "${unset}"`, "optimisticResult")
			]
		:	fallback
	// parenthesized so V8 compiles it along with the factory rather than
	// again on its first call
	return new DynamicFunction<(...args: unknown[]) => BaseRoot["rootApply"]>(
		"allows",
		"apply",
		"optimistic",
		"node",
		"clone",
		"Traversal",
		"config",
		`return (function ${node.id}(data, onFail) {\n    ${body.join("\n    ")}\n})`
	)(
		node.traverseAllows,
		node.traverseApply,
		(node as UnionNode).traverseOptimistic,
		node,
		node.$.resolvedConfig.clone,
		Traversal,
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
	optimistic?: (data: unknown) => unknown
]

// a unit declares each traversal as a const-bound function expression, so
// members call each other directly (function declarations delay TurboFan's
// optimization of large units), then returns each reference's traversals in
// the order of references. A node bound by an earlier unit is declared once
// a member reaches it, after the references, and is not returned.
const precompileReferences = (
	references: readonly BaseNode[],
	linkage: UnitLinkage
) => {
	const unit = new CompiledFunction<
		(...args: unknown[]) => PrecompiledTraversals[],
		string[]
	>()
	const traversalsByReference = references.map(node =>
		declareTraversals(unit, linkage, node)
	)
	for (let i = 0; i < linkage.reached.length; i++)
		declareTraversals(unit, linkage, linkage.reached[i])
	return unit.return(`[${traversalsByReference.join(", ")}]`)
}

const declareTraversals = (
	unit: CompiledFunction,
	linkage: UnitLinkage,
	node: BaseNode
): string => {
	const traversals = [
		declareTraversal(unit, linkage, node, "Allows"),
		declareTraversal(unit, linkage, node, "Apply")
	]
	// an Optimistic traversal runs only from a branchedOptimistic union's
	// root apply, or from another Optimistic traversal for a discriminant
	// case that is itself branchedOptimistic
	if (node.rootApplyStrategy === "branchedOptimistic")
		traversals.push(declareTraversal(unit, linkage, node, "Optimistic"))
	return `[${traversals.join(", ")}]`
}

// what a unit's members reach beyond its declarations, each passed to it as
// a parameter: the traversals of reused nodes they invoke, named as invoked,
// then the values they read through js.ref. An invoked traversal resolves by
// id among the unit's references; one outside them leaves the unit open. An
// unreached node is reached, and so declared, once a member invokes it.
type UnitLinkage = {
	referencesById: Map<string, BaseNode>
	reused: Set<BaseNode>
	unreached: Set<BaseNode>
	reached: BaseNode[]
	dependencies: Map<Fn, string>
	refs: NodeCompiler.Refs
	closed: boolean
}

// compiles a traversal of a unit, linking each traversal it invokes
class TraversalCompiler extends NodeCompiler {
	readonly linkage: UnitLinkage

	constructor(kind: TraversalKind, linkage: UnitLinkage) {
		super(
			kind === "Optimistic" ?
				{ kind: "Allows", optimistic: true, refs: linkage.refs }
			:	{ kind, refs: linkage.refs }
		)
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
	: (node as UnionNode).traverseOptimistic

const declareTraversal = (
	unit: CompiledFunction,
	linkage: UnitLinkage,
	node: BaseNode,
	kind: TraversalKind
): string => {
	const js = new TraversalCompiler(kind, linkage).indent()
	node.compile(js)
	const name = js.referenceToId(node.id, { kind })
	unit.const(name, `function ${js.write("")}`)
	return name
}

// only a root's context (through `this`) and a scope alias's (until the alias
// is parsed) are ever resolved by id, so no other context is registered
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
	readonly nodesByHash: Record<string, BaseNode> = {}
	readonly intrinsic: Omit<typeof $ark.intrinsic, `json${string}`>

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkSchemaScopeConfig
	) {
		this.config = mergeConfigs($ark.config, config)

		this.resolvedConfig = mergeConfigs($ark.resolvedConfig, config)

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

		if (!constructingRootSchemaScope) {
			// a scope with nothing to parse may still be unbootstrapped here, and
			// doing it from inside the unknown union's parse would build the union
			// twice
			bootstrap()
			cacheUnknownUnion(this)
		}

		this.intrinsic =
			$ark.intrinsic ?
				flatMorph($ark.intrinsic, (k, v) =>
					// don't include cyclic aliases from JSON scope
					k.startsWith("json") ? [] : [k, this.bindReference(v as never)]
				)
				// intrinsic won't be available during bootstrapping,  so we lie
				// about the type here as an extrnal convenience
			:	({} as never)
	}

	protected cacheGetter<name extends keyof this>(
		name: name,
		value: this[name]
	): this[name] {
		Object.defineProperty(this, name, { value })
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
				:	new (reference.constructor as any)(reference.attachments, this)
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
				// the alias resolves through this.resolutions from here on, so
				// nothing can read its context by id
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
		// any parse may be the process's first, so the shared nodes and
		// intrinsics take their ids ahead of the one allocated here
		bootstrap()
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
					hasArkKind(def, "module") ?
						bindModule(def, this)
					:	bootstrapAliasReferences(this.maybeResolve(name)!)
			}

			// force node.resolution getter evaluation
			// eslint-disable-next-line @typescript-eslint/no-unused-expressions
			for (const node of this.lazyResolutions) node.resolution

			this._exportedResolutions = resolutionsOfModule(this, this._exports)

			this._json = resolutionsToJson(this._exportedResolutions)
			Object.assign(this.resolutions, this._exportedResolutions)

			this.references = Object.values(this.referencesById)
			if (!this.resolvedConfig.jitless)
				this.precompilation = precompile(this.references, this)
			this.resolved = true
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
		return this.export()[name as never]
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

		const hasPreassignedId = ctxInputOrNode.id !== undefined
		const ctx = registerParseContext(this.createParseContext(ctxInputOrNode))
		let node = this.bindReference(this.parseOwnDefinitionFormat(def, ctx))

		// if the node is recursive e.g. { box: "this" }, we need to make sure it
		// has the original id from context so that its references compile correctly
		if (node.isCyclic) node = withId(node, ctx.id)

		if (!hasPreassignedId) releaseUnusedContextId(ctx.id, node)
		else nodesByRegisteredId[ctx.id] = node

		return node
	}

	finalize<node extends BaseRoot>(node: node): node {
		// a node referencing a `this` whose enclosing type is still being parsed,
		// e.g. Record<string, this>, can't be resolved yet. the enclosing parse
		// finalizes it once the context has been replaced with the resolved node.
		if (node.isCyclic && hasUnresolvedContextAlias(node)) return node

		bootstrapAliasReferences(node)
		if (!node.precompilation && !this.resolvedConfig.jitless)
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

// each parse context gets a new id, because a nested definition can refer to
// it (e.g. with "this"). if the result node does not use that id (e.g. the
// node came from a cache), no node can refer to the id. remove it, so that the
// global registry does not grow each time an equivalent type is parsed.
const releaseUnusedContextId = (id: NodeId, node: BaseNode) => {
	if (node.id === id) nodesByRegisteredId[id] = node
	else delete nodesByRegisteredId[id]
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

/** The half of the root scope's construction that needs a set engine */
export const bootstrapRootScope = (): void => {
	cacheUnknownUnion(rootSchemaScope)
	// ensure the scope is resolved so JIT will be applied to future types
	rootSchemaScope.export()
}

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
