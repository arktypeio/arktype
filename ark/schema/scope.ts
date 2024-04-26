import {
	CompiledFunction,
	type Dict,
	DynamicBase,
	type Json,
	type PartialRecord,
	type array,
	flatMorph,
	type flattenListable,
	hasDomain,
	isArray,
	printable,
	type requireKeys,
	type show,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import { globalConfig, mergeConfigs } from "./config.js"
import {
	type GenericSchema,
	validateUninstantiatedGenericNode
} from "./generic.js"
import type { inferSchema, validateSchema } from "./inference.js"
import type { internalKeywords } from "./keywords/internal.js"
import type { jsObjects } from "./keywords/jsObjects.js"
import type { Ark } from "./keywords/keywords.js"
import type { tsKeywords } from "./keywords/tsKeywords.js"
import {
	type NodeDef,
	nodeImplementationsByKind,
	type reducibleKindOf
} from "./kinds.js"
import { type PreparsedNodeResolution, SchemaModule } from "./module.js"
import type { Node, RawNode, SchemaDef } from "./node.js"
import { type NodeParseOptions, parseNode, schemaKindOf } from "./parse.js"
import type { RawSchema, Schema } from "./schema.js"
import { type AliasNode, normalizeAliasDef } from "./schemas/alias.js"
import type { distillIn, distillOut } from "./schemas/morph.js"
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
	SchemaKind
} from "./shared/implement.js"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.js"
import {
	arkKind,
	hasArkKind,
	type internalImplementationOf,
	isNode
} from "./shared/utils.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: RawSchema }

export type BaseResolutions = Record<string, RawSchema>

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
	/** @internal */
	readonly registerKeywords?: boolean
	/** @internal */
	readonly prereducedAliases?: boolean
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

export type RawSchemaResolutions = Record<string, RawResolution | undefined>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type PrivateDeclaration<key extends string = string> = `#${key}`

type toRawScope<$> = RawSchemaScope<{
	[k in keyof $]: $[k] extends { [arkKind]: infer kind } ?
		kind extends "generic" ? GenericSchema
		: kind extends "module" ? RawSchemaModule
		: never
	:	RawSchema
}>

export type PrimitiveKeywords = typeof tsKeywords &
	typeof jsObjects &
	typeof internalKeywords

export type RawResolution = RawSchema | GenericSchema | RawSchemaModule

type CachedResolution = string | RawResolution

const schemaBranchesOf = (schema: object) =>
	isArray(schema) ? schema
	: "branches" in schema && isArray(schema.branches) ? schema.branches
	: undefined

const throwMismatchedNodeSchemaError = (expected: NodeKind, actual: NodeKind) =>
	throwParseError(
		`Node of kind ${actual} is not valid as a ${expected} definition`
	)

const nodeCountsByPrefix: PartialRecord<string, number> = {}

const nodesById: Record<string, RawNode | undefined> = {}

export class RawSchemaScope<
	$ extends RawSchemaResolutions = RawSchemaResolutions
> implements internalImplementationOf<SchemaScope, "infer" | "inferIn" | "$">
{
	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig;
	readonly [arkKind] = "scope"

	readonly referencesById: { [name: string]: RawNode } = {}
	references: readonly RawNode[] = []
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
		return RawSchemaScope.keywords
	}

	static ambient: RawSchemaScope

	get ambient(): RawSchemaScope {
		return (this.constructor as typeof RawSchemaScope).ambient
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
				this.aliases[k.slice(1)] = def[k]
				return false
			}
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
					hasArkKind(resolution, "schema") ?
						resolution.bindScope(this)
					:	resolution
				]
			)
		}
	}

	get raw(): this {
		return this
	}

	schema = ((def: SchemaDef, opts?: NodeParseOptions): RawSchema =>
		this.node(schemaKindOf(def), def, opts)).bind(this)

	defineSchema = ((def: SchemaDef) => def).bind(this)

	units = ((values: unknown[], opts?: NodeParseOptions): RawSchema => {
		const uniqueValues: unknown[] = []
		for (const value of values)
			if (!uniqueValues.includes(value)) uniqueValues.push(value)

		const branches = uniqueValues.map(unit => this.node("unit", { unit }, opts))
		return this.node("union", branches, {
			...opts,
			prereduced: true
		})
	}).bind(this)

	protected lazyResolutions: AliasNode[] = []
	lazilyResolve(syntheticAlias: string, resolve: () => RawSchema): AliasNode {
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

	node = (<kinds extends NodeKind | array<SchemaKind>>(
		kinds: kinds,
		nodeDef: NodeDef<flattenListable<kinds>>,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<flattenListable<kinds>>> => {
		let kind: NodeKind =
			typeof kinds === "string" ? kinds : schemaKindOf(nodeDef, kinds)

		let def: unknown = nodeDef

		if (isNode(def) && def.kind === kind) return def.bindScope(this) as never

		if (kind === "alias" && !opts?.prereduced) {
			const resolution = this.resolveSchema(
				normalizeAliasDef(def as never).alias
			)
			def = resolution
			kind = resolution.kind
		} else if (kind === "union" && hasDomain(def, "object")) {
			const branches = schemaBranchesOf(def)
			if (branches?.length === 1) {
				def = branches[0]
				kind = schemaKindOf(def)
			}
		}

		const impl = nodeImplementationsByKind[kind]
		const normalizedDef = impl.normalize?.(def) ?? def
		// check again after normalization in case a node is a valid collapsed
		// schema for the kind (e.g. sequence can collapse to element accepting a Node)
		if (isNode(normalizedDef)) {
			return normalizedDef.kind === kind ?
					(normalizedDef.bindScope(this) as never)
				:	throwMismatchedNodeSchemaError(kind, normalizedDef.kind)
		}

		const prefix = opts?.alias ?? kind
		nodeCountsByPrefix[prefix] ??= 0
		const id = `${prefix}${++nodeCountsByPrefix[prefix]!}`

		const node = parseNode(kind, {
			...opts,
			id,
			$: this,
			def: normalizedDef
		}).bindScope(this)

		nodesById[id] = node

		if (this.resolved) {
			// this node was not part of the original scope, so compile an anonymous scope
			// including only its references
			bindCompiledScope(node.contributesReferences)
		} else {
			// we're still parsing the scope itself, so defer compilation but
			// add the node as a reference
			Object.assign(this.referencesById, node.contributesReferencesById)
		}

		return node as never
	}).bind(this)

	parseRoot(def: unknown, opts?: NodeParseOptions): RawSchema {
		return this.schema(def as never, opts)
	}

	resolveSchema(name: string): RawSchema {
		return (
			this.maybeResolveSchema(name) ??
			throwParseError(writeUnresolvableMessage(name))
		)
	}

	maybeResolveSchema(name: string): RawSchema | undefined {
		const result = this.maybeResolveGenericOrSchema(name)
		if (hasArkKind(result, "generic")) return
		return result
	}

	maybeResolveGenericOrSchema(
		name: string
	): RawSchema | GenericSchema | undefined {
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
	): RawSchema | GenericSchema | undefined {
		return resolveSubalias(this.aliases, name)
	}

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): show<destructuredImportContext<$, names>> {
		return new SchemaModule(
			flatMorph(this.export(...names) as any, (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	private _exportedResolutions: RawSchemaResolutions | undefined
	private _exports: SchemaExportCache | undefined
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): show<destructuredExportContext<$, names>> {
		if (!this._exports) {
			this._exports = {}
			for (const name of this.exportedNames)
				this._exports[name] = this.maybeResolve(name) as never
			this.lazyResolutions.forEach(node => node.resolution)

			this._exportedResolutions = resolutionsOfModule(this, this._exports)
			// TODO: add generic json
			Object.assign(
				this.json,
				flatMorph(this._exportedResolutions as Dict, (k, v) =>
					hasArkKind(v, "schema") ? [k, v.json] : []
				)
			)
			Object.assign(this.resolutions, this._exportedResolutions)
			if (this.config.registerKeywords)
				Object.assign(RawSchemaScope.keywords, this._exportedResolutions)
			this.references = Object.values(this.referencesById)
			bindCompiledScope(this.references)
			this.resolved = true
		}
		const namesToExport = names.length ? names : this.exportedNames
		return new SchemaModule(
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
): RawSchema | GenericSchema | undefined => {
	const dotIndex = name.indexOf(".")
	if (dotIndex === -1) return

	const dotPrefix = name.slice(0, dotIndex)
	const prefixDef = base[dotPrefix]
	// if the name includes ".", but the prefix is not an alias, it
	// might be something like a decimal literal, so just fall through to return
	if (prefixDef === undefined) return
	if (!hasArkKind(prefixDef, "module"))
		return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))

	const subalias = name.slice(dotIndex + 1)
	const resolution = prefixDef[subalias]
	// if the first part of name is a submodule but the suffix is
	// unresolvable, we can throw immediately
	if (resolution === undefined) {
		if (hasArkKind(resolution, "module"))
			return resolveSubalias(resolution, subalias)
		return throwParseError(writeUnresolvableMessage(name))
	}

	if (hasArkKind(resolution, "schema") || hasArkKind(resolution, "generic"))
		return resolution

	throwInternalError(
		`Unexpected resolution for alias '${name}': ${printable(resolution)}`
	)
}

export type validateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends PreparsedNodeResolution ? aliases[k]
	:	validateSchema<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: aliases[k] extends PreparsedNodeResolution ? aliases[k]
	:	inferSchema<aliases[k], aliases>
} & unknown

export const schemaScope = <const aliases>(
	aliases: validateAliases<aliases>,
	config?: ArkConfig
): SchemaScope<instantiateAliases<aliases>> => new SchemaScope(aliases, config)

export interface SchemaScope<$ = any> {
	$: $
	infer: distillOut<$>
	inferIn: distillIn<$>

	[arkKind]: "scope"
	config: ArkConfig
	references: readonly RawNode[]
	json: Json
	exportedNames: array<exportedNameOf<$>>

	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	aliases: Record<string, unknown>
	raw: toRawScope<$>

	schema<const def extends SchemaDef>(
		def: def,
		opts?: NodeParseOptions
	): Schema<inferSchema<def, $>, $>

	defineSchema<const def extends SchemaDef>(def: def): def

	units<const branches extends array>(
		values: branches,
		opts?: NodeParseOptions
	): Schema<branches[number], $>

	node<kinds extends NodeKind | array<SchemaKind>>(
		kinds: kinds,
		schema: NodeDef<flattenListable<kinds>>,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<flattenListable<kinds>>>

	parseRoot(def: unknown, opts?: NodeParseOptions): RawSchema

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<show<destructuredImportContext<$, names>>>

	export<names extends exportedNameOf<$>[]>(
		...names: names
	): SchemaModule<show<destructuredExportContext<$, names>>>

	resolve<name extends exportedNameOf<$>>(
		name: name
	): destructuredExportContext<$, []>[name]
}

export const SchemaScope: new <$ = any>(
	...args: ConstructorParameters<typeof RawSchemaScope>
) => SchemaScope<$> = RawSchemaScope as never

export const root: SchemaScope<{}> = new SchemaScope({})

export const schema = root.schema
export const node = root.node
export const defineSchema = root.defineSchema
export const units = root.units
export const rawSchema = root.raw.schema
export const rawNode = root.raw.node
export const defineRawSchema = root.raw.defineSchema
export const rawUnits = root.raw.units

export class RawSchemaModule<
	resolutions extends RawSchemaResolutions = RawSchemaResolutions
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

export type SchemaExportCache = Record<
	string,
	RawSchema | GenericSchema | RawSchemaModule | undefined
>

const resolutionsOfModule = ($: RawSchemaScope, typeSet: SchemaExportCache) => {
	const result: RawSchemaResolutions = {}
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
		else if (hasArkKind(v, "schema")) result[k] = v
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

export const bindCompiledScope = (references: readonly RawNode[]): void => {
	const compiledTraversals = compileScope(references)
	for (const node of references) {
		if (node.jit) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			continue
		}
		node.jit = true
		node.traverseAllows =
			compiledTraversals[`${node.id}Allows`].bind(compiledTraversals)
		if (node.isSchema() && !node.allowsRequiresContext) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = node.traverseAllows as never
		}
		node.traverseApply =
			compiledTraversals[`${node.id}Apply`].bind(compiledTraversals)
	}
}

const compileScope = (references: readonly RawNode[]) => {
	return new CompiledFunction()
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
}
