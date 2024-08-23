import {
	ParseError,
	flatMorph,
	hasDomain,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	type Constructor,
	type Dict,
	type Fn,
	type Json,
	type anyOrNever,
	type array,
	type conform,
	type flattenListable,
	type listable,
	type noSuggest
} from "@ark/util"
import { resolveConfig, type ArkConfig } from "./config.ts"
import {
	GenericRoot,
	LazyGenericBody,
	type GenericRootParser
} from "./generic.ts"
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
	parseNode,
	registerNodeId,
	schemaKindOf,
	type NodeParseContext,
	type NodeParseOptions
} from "./parse.ts"
import { normalizeAliasSchema, type Alias } from "./roots/alias.ts"
import type { BaseRoot } from "./roots/root.ts"
import { CompiledFunction, NodeCompiler } from "./shared/compile.ts"
import type { NodeKind, RootKind } from "./shared/implement.ts"
import { $ark } from "./shared/registry.ts"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.ts"
import { arkKind, hasArkKind, isNode } from "./shared/utils.ts"

export type InternalResolutions = Record<string, InternalResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type resolvableReferenceIn<$> = {
	[k in keyof $]: k extends string ?
		k extends PrivateDeclaration<infer alias> ? alias
		: // technically, $root subtypes are resolvable, but there's never a good
		// reason to use them over the base alias
		k extends noSuggest | "$root" ? never
		: k
	:	never
}[keyof $]

export type resolveReference<reference extends resolvableReferenceIn<$>, $> =
	reference extends keyof $ ? $[reference] : $[`#${reference}` & keyof $]

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

type CachedResolution = string | BaseRoot | GenericRoot

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

const scopesById: Record<string, BaseScope | undefined> = {}

export interface ArkScopeConfig extends ArkConfig {
	ambient?: boolean | string
	prereducedAliases?: boolean
}

export type ResolvedArkScopeConfig = resolveConfig<ArkScopeConfig>

$ark.ambient ??= {} as never

export abstract class BaseScope<$ extends {} = {}> {
	readonly config: ArkScopeConfig
	readonly resolvedConfig: ResolvedArkScopeConfig
	readonly id = `${Object.keys(scopesById).length}$`

	get [arkKind](): "scope" {
		return "scope"
	}

	readonly referencesById: { [id: string]: BaseNode } = {}
	references: readonly BaseNode[] = []
	protected readonly resolutions: {
		[alias: string]: CachedResolution | undefined
	} = {}
	readonly json: Json = {}
	exportedNames: string[] = []
	readonly aliases: Record<string, unknown> = {}
	protected resolved = false

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkScopeConfig
	) {
		this.config = config ?? {}
		this.resolvedConfig = resolveConfig(config)

		const aliasEntries = Object.entries(def).map(entry =>
			this.preparseAlias(...entry)
		)

		aliasEntries.forEach(([k, v]) => {
			if (k[0] === "#") {
				const name = k.slice(1)
				if (name in this.aliases)
					throwParseError(writeDuplicateAliasError(name))
				this.aliases[name] = v
			} else {
				if (k in this.aliases) throwParseError(writeDuplicateAliasError(k))
				this.aliases[k] = v
				this.exportedNames.push(k)
			}
		}) as never

		scopesById[this.id] = this
	}

	get internal(): this {
		return this
	}

	defineSchema<def extends RootSchema>(def: def): def {
		return def
	}

	generic: GenericRootParser = (...params) => {
		const $: BaseScope = this as never
		return (def: unknown, possibleHkt?: Constructor) =>
			new GenericRoot(
				params,
				possibleHkt ? new LazyGenericBody(def as Fn) : def,
				$,
				$
			) as never
	}

	units = (values: array, opts?: NodeParseOptions): BaseRoot => {
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
				alias: syntheticAlias ?? "synthetic",
				resolve
			},
			{ prereduced: true }
		)
		if (!this.resolved) this.lazyResolutions.push(node)
		return node
	}

	rootNode = (def: RootSchema, opts?: NodeParseOptions): BaseRoot =>
		this.node(schemaKindOf(def), def, opts)

	protected preparseNode = (
		kinds: NodeKind | listable<RootKind>,
		schema: unknown,
		opts: NodeParseOptions
	): BaseNode | NodeParseContext => {
		let kind: NodeKind =
			typeof kinds === "string" ? kinds : schemaKindOf(schema, kinds)

		if (isNode(schema) && schema.kind === kind) return schema.bindScope(this)

		if (kind === "alias" && !opts?.prereduced) {
			const resolution = this.resolveRoot(
				normalizeAliasSchema(schema as never).alias
			)
			schema = resolution
			kind = resolution.kind
		} else if (kind === "union" && hasDomain(schema, "object")) {
			const branches = schemaBranchesOf(schema)
			if (branches?.length === 1) {
				schema = branches[0]
				kind = schemaKindOf(schema)
			}
		}

		const impl = nodeImplementationsByKind[kind]
		const normalizedSchema =
			impl.normalize?.(schema, this.resolvedConfig) ?? schema
		// check again after normalization in case a node is a valid collapsed
		// schema for the kind (e.g. sequence can collapse to element accepting a Node')
		if (isNode(normalizedSchema)) {
			return normalizedSchema.kind === kind ?
					normalizedSchema.bindScope(this)
				:	throwMismatchedNodeRootError(kind, normalizedSchema.kind)
		}

		const id = registerNodeId(kind, opts.alias)

		return {
			...opts,
			$: this,
			args: opts.args ?? {},
			kind,
			normalizedSchema,
			id
		}
	}

	node = <
		kinds extends NodeKind | array<RootKind>,
		prereduced extends boolean = false
	>(
		kinds: kinds,
		nodeSchema: NodeSchema<flattenListable<kinds>>,
		opts = {} as NodeParseOptions<prereduced>
	): nodeOfKind<
		prereduced extends true ? flattenListable<kinds>
		:	reducibleKindOf<flattenListable<kinds>>
	> => {
		const preparsed = this.preparseNode(kinds, nodeSchema, opts)

		const node =
			isNode(preparsed) ? preparsed : parseNode(preparsed).bindScope(this)

		if (this.resolved) {
			// this node was not part of the original scope, so compile an anonymous scope
			// including only its references
			if (!this.resolvedConfig.jitless) bindCompiledScope(node.references)
		} else {
			// we're still parsing the scope itself, so defer compilation but
			// add the node as a reference
			Object.assign(this.referencesById, node.referencesById)
		}

		return node as never
	}

	protected finalizeRootArgs(
		opts: NodeParseOptions,
		resolve: () => BaseRoot
	): NodeParseOptions {
		const isResolution = opts.alias && opts.alias in this.aliases
		// if the definition being parsed is not a scope alias and is not a
		// generic instantiation (i.e. opts don't include args), add this as a resolution.
		if (!isResolution)
			// this.lazilyResolve(resolve) as never
			opts.args ??= { this: $ark.intrinsic.unknown || resolve }

		return opts
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

	preparseRoot(def: unknown): unknown {
		return def
	}

	preparseAlias(k: string, v: unknown): AliasDefEntry {
		return [k, v]
	}

	maybeResolve(name: string): Exclude<CachedResolution, string> | undefined {
		const resolution = this.maybeShallowResolve(name)

		return typeof resolution === "string" ?
				this.node("alias", { alias: resolution }, { prereduced: true })
			:	(resolution ?? this.maybeResolveSubalias(name))
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

	maybeShallowResolve(name: string): CachedResolution | undefined {
		const cached = this.resolutions[name]
		if (cached) return cached
		const def = this.aliases[name] ?? this.ambient?.[name]

		if (!def) return this.maybeResolveSubalias(name)

		const preparsed = this.preparseRoot(def)
		if (hasArkKind(preparsed, "generic"))
			return (this.resolutions[name] = preparsed.bindScope(this))

		if (hasArkKind(preparsed, "module")) {
			if (preparsed.$root)
				return (this.resolutions[name] = preparsed.$root.bindScope(this))
			else return throwParseError(writeMissingSubmoduleAccessMessage(name))
		}

		this.resolutions[name] = name
		return (this.resolutions[name] = this.parseRoot(preparsed, {
			alias: name
		}).bindScope(this))
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
			flatMorph(this.export(...(names as never)) as any, (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

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
				if (hasArkKind(def, "module"))
					this._exports[name] = bindModule(def, this)
				else {
					const resolution = this.maybeResolve(name)!
					resolution.references
						.filter(node => node.hasKind("alias"))
						.forEach(aliasNode => {
							Object.assign(
								aliasNode.referencesById,
								aliasNode.resolution.referencesById
							)
							resolution.references.forEach(ref => {
								if (aliasNode.id in ref.referencesById)
									Object.assign(ref.referencesById, aliasNode.referencesById)
							})
						})
					this._exports[name] = resolution as never
				}
			}

			this.lazyResolutions.forEach(node => node.resolution)

			if (this.resolvedConfig.ambient === true)
				// spread all exports to ambient
				Object.assign($ark.ambient as {}, this._exports)
			else if (typeof this.resolvedConfig.ambient === "string") {
				// add exports as a subscope with the config value as a name
				Object.assign($ark.ambient as {}, {
					[this.resolvedConfig.ambient]: new RootModule({
						...this._exports
					})
				})
			}

			this._exportedResolutions = resolutionsOfModule(this, this._exports)

			Object.assign(this.json, resolutionsToJson(this._exportedResolutions))
			Object.assign(this.resolutions, this._exportedResolutions)

			this.references = Object.values(this.referencesById)
			if (!this.resolvedConfig.jitless) bindCompiledScope(this.references)
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

	abstract parseRoot(schema: unknown, opts?: NodeParseOptions): BaseRoot
}

const resolutionsToJson = (resolutions: InternalResolutions): Json =>
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
			resolution.$root ??
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
	config?: ArkScopeConfig
) => SchemaScope<instantiateAliases<aliases>>

export const schemaScope: SchemaScopeParser = (aliases, config) =>
	new SchemaScope(aliases, config)

export class SchemaScope<
	$ extends InternalResolutions = InternalResolutions
> extends BaseScope<$> {
	parseRoot = (schema: RootSchema, opts: NodeParseOptions = {}): BaseRoot => {
		const node = this.rootNode(
			schema as never,
			this.finalizeRootArgs(opts, () => node)
		)
		return node
	}
}

export const rootSchemaScope: SchemaScope = new SchemaScope({})

export const parseAsSchema = (
	def: unknown,
	opts?: NodeParseOptions
): BaseRoot | ParseError => {
	try {
		return rootNode(def as RootSchema, opts) as never
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

export const bindCompiledScope = (references: readonly BaseNode[]): void => {
	const compiledTraversals = compileScope(references)
	for (const node of references) {
		if (node.jit) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			continue
		}
		node.jit = true
		node.traverseAllows =
			compiledTraversals[`${node.id}Allows`].bind(compiledTraversals)
		if (node.isRoot() && !node.allowsRequiresContext) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = node.traverseAllows as never
		}
		node.traverseApply =
			compiledTraversals[`${node.id}Apply`].bind(compiledTraversals)
	}
}

const compileScope = (references: readonly BaseNode[]) =>
	new CompiledFunction()
		.block("return", js => {
			references.forEach(node => {
				const allowsCompiler = new NodeCompiler("Allows").indent()
				node.compile(allowsCompiler)
				const applyCompiler = new NodeCompiler("Apply").indent()
				node.compile(applyCompiler)
				js.line(`${allowsCompiler.writeMethod(`${node.id}Allows`)},`).line(
					`${applyCompiler.writeMethod(`${node.id}Apply`)},`
				)
			})
			return js
		})
		.compile<
			() => {
				[k: `${string}Allows`]: TraverseAllows
				[k: `${string}Apply`]: TraverseApply
			}
		>()()

// ensure the scope is resolved so JIT will be applied to future types
rootSchemaScope.export()

export const rootNode: SchemaScope["rootNode"] = rootSchemaScope.rootNode
export const node: SchemaScope["node"] = rootSchemaScope.node
export const defineSchema: SchemaScope["defineSchema"] =
	rootSchemaScope.defineSchema
export const genericNode: SchemaScope["generic"] = rootSchemaScope.generic
