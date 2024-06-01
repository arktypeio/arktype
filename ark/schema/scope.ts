import {
	CompiledFunction,
	DynamicBase,
	bound,
	envHasCsp,
	flatMorph,
	hasDomain,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	type Dict,
	type Json,
	type PartialRecord,
	type array,
	type flattenListable,
	type requireKeys,
	type show
} from "@arktype/util"
import { globalConfig, mergeConfigs } from "./config.js"
import {
	validateUninstantiatedGenericNode,
	type GenericRoot
} from "./generic.js"
import type { inferRoot, validateRoot } from "./inference.js"
import type { internalKeywords } from "./keywords/internal.js"
import type { jsObjects } from "./keywords/jsObjects.js"
import type { Ark } from "./keywords/keywords.js"
import type { tsKeywords } from "./keywords/tsKeywords.js"
import {
	nodeImplementationsByKind,
	type Node,
	type NodeSchema,
	type RootSchema,
	type reducibleKindOf
} from "./kinds.js"
import {
	RootModule,
	type PreparsedNodeResolution,
	type SchemaModule
} from "./module.js"
import type { BaseNode } from "./node.js"
import { parseNode, schemaKindOf, type NodeParseOptions } from "./parse.js"
import { normalizeAliasSchema, type AliasNode } from "./roots/alias.js"
import type { BaseRoot, Root } from "./roots/root.js"
import { NodeCompiler } from "./shared/compile.js"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.js"
import type {
	DescriptionWriter,
	NodeKind,
	RootKind
} from "./shared/implement.js"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.js"
import {
	arkKind,
	hasArkKind,
	isNode,
	type internalImplementationOf
} from "./shared/utils.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: BaseRoot }

export type BaseResolutions = Record<string, BaseRoot>

declare global {
	export interface StaticArkConfig {
		preserve(): never
		ambient(): Ark
	}
}

export type ambient = ReturnType<StaticArkConfig["ambient"]>

type nodeConfigForKind<kind extends NodeKind> = Readonly<
	show<
		{
			description?: DescriptionWriter<kind>
		} & (kind extends ArkErrorCode ?
			{
				expected?: ExpectedWriter<kind>
				actual?: ActualWriter<kind>
				problem?: ProblemWriter<kind>
				message?: MessageWriter<kind>
			}
		:	{})
	>
>

type NodeConfigsByKind = {
	[kind in NodeKind]: nodeConfigForKind<kind>
}

export type NodeConfig<kind extends NodeKind = NodeKind> =
	NodeConfigsByKind[kind]

type UnknownNodeConfig = {
	description?: DescriptionWriter
	expected?: ExpectedWriter
	actual?: ActualWriter
	problem?: ProblemWriter
	message?: MessageWriter
}

export type ParsedUnknownNodeConfig = requireKeys<
	UnknownNodeConfig,
	"description"
>

export type StaticArkOption<k extends keyof StaticArkConfig> = ReturnType<
	StaticArkConfig[k]
>

export interface ArkConfig extends Partial<Readonly<NodeConfigsByKind>> {
	jitless?: boolean
	/** @internal */
	registerKeywords?: boolean
	/** @internal */
	prereducedAliases?: boolean
}

type resolveConfig<config extends ArkConfig> = {
	[k in keyof config]-?: k extends NodeKind ? Required<config[k]> : config[k]
}

export type ResolvedArkConfig = resolveConfig<ArkConfig>

export const defaultConfig: ResolvedArkConfig = Object.assign(
	flatMorph(nodeImplementationsByKind, (kind, implementation) => [
		kind,
		implementation.defaults
	]),
	{
		jitless: envHasCsp(),
		registerKeywords: false,
		prereducedAliases: false
	} satisfies Omit<ResolvedArkConfig, NodeKind>
) as never

const nonInheritedKeys = [
	"registerKeywords",
	"prereducedAliases"
] as const satisfies array<keyof ArkConfig>

export const extendConfig = (
	base: ArkConfig,
	extension: ArkConfig | undefined
): ArkConfig => {
	if (!extension) return base
	const result = mergeConfigs(base, extension)
	nonInheritedKeys.forEach(k => {
		if (!(k in extension)) delete result[k]
	})
	return result
}

export const resolveConfig = (
	config: ArkConfig | undefined
): ResolvedArkConfig =>
	extendConfig(extendConfig(defaultConfig, globalConfig), config) as never

export type RawRootResolutions = Record<string, RawResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type PrivateDeclaration<key extends string = string> = `#${key}`

type toRawScope<$> = RawRootScope<{
	[k in keyof $]: $[k] extends { [arkKind]: infer kind } ?
		kind extends "generic" ? GenericRoot
		: kind extends "module" ? RawRootModule
		: never
	:	BaseRoot
}>

export type PrimitiveKeywords = typeof tsKeywords &
	typeof jsObjects &
	typeof internalKeywords

export type RawResolution = BaseRoot | GenericRoot | RawRootModule

type CachedResolution = string | RawResolution

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

const nodeCountsByPrefix: PartialRecord<string, number> = {}

const nodesById: Record<string, BaseNode | undefined> = {}

let scopeCount = 0

const scopesById: Record<string, RawRootScope | undefined> = {}

export class RawRootScope<$ extends RawRootResolutions = RawRootResolutions>
	implements internalImplementationOf<RootScope, "t">
{
	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig
	readonly id = `$${++scopeCount}`;
	readonly [arkKind] = "scope"

	readonly referencesById: { [name: string]: BaseNode } = {}
	references: readonly BaseNode[] = []
	protected readonly resolutions: {
		[alias: string]: CachedResolution | undefined
	} = {}
	readonly json: Json = {}
	exportedNames: string[]
	readonly aliases: Record<string, unknown> = {}
	protected resolved = false

	// these allow builtin types to be accessed during parsing without cyclic imports
	// they are populated as each scope is parsed with `registerKeywords` in its config
	/** @internal */
	static keywords = {} as PrimitiveKeywords

	/** @internal */
	get keywords(): PrimitiveKeywords {
		return RawRootScope.keywords
	}

	static ambient: RawRootScope

	get ambient(): RawRootScope {
		return (this.constructor as typeof RawRootScope).ambient
	}

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		def: Record<string, unknown>,
		config?: ArkConfig
	) {
		this.config = config ?? {}
		this.resolvedConfig = resolveConfig(config)
		this.exportedNames = Object.keys(def).filter(k => {
			if (k[0] === "#") {
				const name = k.slice(1)
				if (name in this.aliases)
					throwParseError(writeDuplicateAliasError(name))
				this.aliases[name] = def[k]
				return false
			}
			if (k in this.aliases) throwParseError(writeDuplicateAliasError(k))
			this.aliases[k] = def[k]
			return true
		}) as never
		if (this.ambient) {
			// ensure exportedResolutions is populated
			this.ambient.export()
			// TODO: generics and modules
			this.resolutions = flatMorph(
				this.ambient.resolutions,
				(alias, resolution) => [
					alias,
					hasArkKind(resolution, "root") ?
						resolution.bindScope(this)
					:	resolution
				]
			)
		}
		scopesById[this.id] = this
	}

	get raw(): this {
		return this
	}

	@bound
	schema(def: RootSchema, opts?: NodeParseOptions): BaseRoot {
		return this.node(schemaKindOf(def), def, opts)
	}

	@bound
	defineRoot(def: RootSchema): RootSchema {
		return def
	}

	@bound
	units(values: array, opts?: NodeParseOptions): BaseRoot {
		const uniqueValues: unknown[] = []
		for (const value of values)
			if (!uniqueValues.includes(value)) uniqueValues.push(value)

		const branches = uniqueValues.map(unit => this.node("unit", { unit }, opts))
		return this.node("union", branches, {
			...opts,
			prereduced: true
		})
	}

	protected lazyResolutions: AliasNode[] = []
	lazilyResolve(resolve: () => BaseRoot, syntheticAlias?: string): AliasNode {
		if (!syntheticAlias) {
			nodeCountsByPrefix.synthetic ??= 0
			syntheticAlias = `synthetic${++nodeCountsByPrefix.synthetic}`
		}

		const node = this.node(
			"alias",
			{
				alias: syntheticAlias,
				resolve
			},
			{ prereduced: true }
		)
		this.lazyResolutions.push(node)
		return node
	}

	node: <
		kinds extends NodeKind | array<RootKind>,
		prereduced extends boolean = false
	>(
		kinds: kinds,
		nodeSchema: NodeSchema<flattenListable<kinds>>,
		opts?: NodeParseOptions<prereduced>
	) => Node<
		prereduced extends true ? flattenListable<kinds>
		:	reducibleKindOf<flattenListable<kinds>>
	> = (
		((kinds, nodeSchema, opts) => {
			let kind: NodeKind =
				typeof kinds === "string" ? kinds : schemaKindOf(nodeSchema, kinds)

			let schema: unknown = nodeSchema

			if (isNode(schema) && schema.kind === kind)
				return schema.bindScope(this) as never

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
			const normalizedSchema = impl.normalize?.(schema) ?? schema
			// check again after normalization in case a node is a valid collapsed
			// schema for the kind (e.g. sequence can collapse to element accepting a Node)
			if (isNode(normalizedSchema)) {
				return normalizedSchema.kind === kind ?
						(normalizedSchema.bindScope(this) as never)
					:	throwMismatchedNodeRootError(kind, normalizedSchema.kind)
			}

			const prefix = opts?.alias ?? kind
			nodeCountsByPrefix[prefix] ??= 0
			const id = `${prefix}${++nodeCountsByPrefix[prefix]!}`

			const node = parseNode(kind, {
				...opts,
				id,
				$: this,
				schema: normalizedSchema
			}).bindScope(this)

			nodesById[id] = node

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
		}) satisfies this["node"]
	).bind(this)

	parseRoot(def: unknown, opts?: NodeParseOptions): BaseRoot {
		return this.schema(def as never, opts)
	}

	resolveRoot(name: string): BaseRoot {
		return (
			this.maybeResolveRoot(name) ??
			throwParseError(writeUnresolvableMessage(name))
		)
	}

	maybeResolveRoot(name: string): BaseRoot | undefined {
		const result = this.maybeResolveGenericOrRoot(name)
		if (hasArkKind(result, "generic")) return
		return result
	}

	maybeResolveGenericOrRoot(name: string): BaseRoot | GenericRoot | undefined {
		const resolution = this.maybeResolve(name)
		if (hasArkKind(resolution, "module"))
			return throwParseError(writeMissingSubmoduleAccessMessage(name))
		return resolution
	}

	preparseRoot(def: unknown): unknown {
		return def
	}

	maybeResolve(name: string): RawResolution | undefined {
		const resolution = this.maybeShallowResolve(name)
		return typeof resolution === "string" ?
				this.node("alias", { alias: resolution }, { prereduced: true })
			:	resolution
	}

	maybeShallowResolve(name: string): CachedResolution | undefined {
		const cached = this.resolutions[name]
		if (cached) return cached
		let def = this.aliases[name]
		if (!def) return this.maybeResolveSubalias(name)
		def = this.preparseRoot(def)
		if (hasArkKind(def, "generic"))
			return (this.resolutions[name] = validateUninstantiatedGenericNode(def))
		if (hasArkKind(def, "module")) return (this.resolutions[name] = def)
		this.resolutions[name] = name
		return (this.resolutions[name] = this.parseRoot(def))
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	protected maybeResolveSubalias(
		name: string
	): BaseRoot | GenericRoot | undefined {
		return resolveSubalias(this.aliases, name)
	}

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): show<destructuredImportContext<$, names>> {
		return new RootModule(
			flatMorph(this.export(...names) as any, (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	private _exportedResolutions: RawRootResolutions | undefined
	private _exports: RootExportCache | undefined
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): show<destructuredExportContext<$, names>> {
		if (!this._exports) {
			this._exports = {}
			for (const name of this.exportedNames) {
				const resolution = this.maybeResolve(name)
				if (hasArkKind(resolution, "root")) {
					resolution.references
						.filter((node): node is Node<"alias"> => node.hasKind("alias"))
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
				}
				this._exports[name] = resolution as never
			}

			this.lazyResolutions.forEach(node => node.resolution)

			this._exportedResolutions = resolutionsOfModule(this, this._exports)
			// TODO: add generic json
			Object.assign(
				this.json,
				flatMorph(this._exportedResolutions as Dict, (k, v) =>
					hasArkKind(v, "root") ? [k, v.json] : []
				)
			)
			Object.assign(this.resolutions, this._exportedResolutions)
			if (this.config.registerKeywords)
				Object.assign(RawRootScope.keywords, this._exportedResolutions)
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
	): destructuredExportContext<$, []>[name] {
		return this.export()[name] as never
	}
}

const resolveSubalias = (
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
	// if the first part of name is a submodule but the suffix is
	// unresolvable, we can throw immediately
	if (resolution === undefined) {
		if (hasArkKind(resolution, "module"))
			return resolveSubalias(resolution, subalias)
		return throwParseError(writeUnresolvableMessage(name))
	}

	if (hasArkKind(resolution, "root") || hasArkKind(resolution, "generic"))
		return resolution

	throwInternalError(
		`Unexpected resolution for alias '${name}': ${printable(resolution)}`
	)
}

export type validateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends PreparsedNodeResolution ? aliases[k]
	:	validateRoot<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends PreparsedNodeResolution ? aliases[k]
	:	inferRoot<aliases[k], aliases>
} & unknown

export const schemaScope = <const aliases>(
	aliases: validateAliases<aliases>,
	config?: ArkConfig
): RootScope<instantiateAliases<aliases>> => new RootScope(aliases, config)

export interface RootScope<$ = any> {
	t: $
	[arkKind]: "scope"
	config: ArkConfig
	references: readonly BaseNode[]
	json: Json
	exportedNames: array<exportedNameOf<$>>

	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	aliases: Record<string, unknown>
	raw: toRawScope<$>

	schema<const def extends RootSchema>(
		schema: def,
		opts?: NodeParseOptions
	): Root<inferRoot<def, $>, $>

	defineRoot<const def extends RootSchema>(schema: def): def

	units<const branches extends array>(
		values: branches,
		opts?: NodeParseOptions
	): Root<branches[number], $>

	node<kinds extends NodeKind | array<RootKind>>(
		kinds: kinds,
		schema: NodeSchema<flattenListable<kinds>>,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<flattenListable<kinds>>>

	parseRoot(schema: unknown, opts?: NodeParseOptions): BaseRoot

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<show<destructuredImportContext<$, names>>>

	export<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<show<destructuredExportContext<$, names>>>

	resolve<name extends exportedNameOf<$>>(
		name: name
	): $[name] extends PreparsedNodeResolution ? $[name] : Root<$[name], $>
}

export const RootScope: new <$ = any>(
	...args: ConstructorParameters<typeof RawRootScope>
) => RootScope<$> = RawRootScope as never

export const root: RootScope<{}> = new RootScope({})

export const schema: RootScope["schema"] = root.schema
export const node: RootScope["node"] = root.node
export const defineRoot: RootScope["defineRoot"] = root.defineRoot
export const units: RootScope["units"] = root.units
export const rawRoot: RawRootScope["schema"] = root.raw.schema
export const rawNode: RawRootScope["node"] = root.raw.node
export const defineRawRoot: RawRootScope["defineRoot"] = root.raw.defineRoot
export const rawUnits: RawRootScope["units"] = root.raw.units

export class RawRootModule<
	resolutions extends RawRootResolutions = RawRootResolutions
> extends DynamicBase<resolutions> {
	// TODO: kind?
	declare readonly [arkKind]: "module"
}

export type destructuredExportContext<$, names extends exportedNameOf<$>[]> = {
	[k in names extends [] ? exportedNameOf<$> : names[number]]: $[k]
}

export type destructuredImportContext<$, names extends exportedNameOf<$>[]> = {
	[k in names extends [] ? exportedNameOf<$> : names[number] as `#${k &
		string}`]: $[k]
}

export type RootExportCache = Record<
	string,
	BaseRoot | GenericRoot | RawRootModule | undefined
>

const resolutionsOfModule = ($: RawRootScope, typeSet: RootExportCache) => {
	const result: RawRootResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule($, v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "generic")) result[k] = v
		else if (hasArkKind(v, "root")) result[k] = v
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
