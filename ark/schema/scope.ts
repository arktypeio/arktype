import {
	CompiledFunction,
	type Dict,
	DynamicBase,
	type Json,
	type array,
	type evaluate,
	flatMorph,
	type flattenListable,
	isThunk,
	type requireKeys,
	throwParseError
} from "@arktype/util"
import {
	type GenericSchema,
	validateUninstantiatedGenericNode
} from "./api/generic.js"
import type { Ark } from "./api/keywords/keywords.js"
import { SchemaModule } from "./api/module.js"
import type { SchemaScope } from "./api/scope.js"
import type { Node, RawNode, SchemaDef } from "./base.js"
import { mergeConfigs } from "./config.js"
import type { NodeDef, reducibleKindOf } from "./kinds.js"
import { type NodeParseOptions, parseNode, schemaKindOf } from "./parse.js"
import type { RawSchema } from "./schemas/schema.js"
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
	type arkKind,
	hasArkKind,
	type internalImplementationOf
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
	evaluate<
		{
			description?: DescriptionWriter<kind>
		} & (kind extends ArkErrorCode
			? {
					expected?: ExpectedWriter<kind>
					actual?: ActualWriter<kind>
					problem?: ProblemWriter<kind>
					message?: MessageWriter<kind>
				}
			: {})
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
	readonly prereducedAliases?: boolean
}

type resolveConfig<config extends ArkConfig> = {
	[k in keyof config]-?: k extends NodeKind ? Required<config[k]> : config[k]
}

export type ResolvedArkConfig = resolveConfig<ArkConfig>

export const defaultConfig: ResolvedArkConfig = Object.assign(
	flatMorph($ark.nodeImplementationsByKind, (kind, implementation) => [
		kind,
		implementation.defaults
	]),
	{
		prereducedAliases: false
	} satisfies Omit<ResolvedArkConfig, NodeKind>
) as never

const nonInheritedKeys = ["prereducedAliases"] as const satisfies array<
	keyof ArkConfig
>

export const extendConfig = (
	base: ArkConfig,
	extension: ArkConfig | undefined
): ArkConfig => {
	if (!extension) return base
	const result = mergeConfigs(base, extension)
	nonInheritedKeys.forEach((k) => {
		if (!(k in extension)) delete result[k]
	})
	return result
}

export const resolveConfig = (
	config: ArkConfig | undefined
): ResolvedArkConfig => extendConfig(defaultConfig, config) as never

export type RawSchemaResolutions = Record<
	string,
	RawSchema | GenericSchema | undefined
>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type PrivateDeclaration<key extends string = string> = `#${key}`

export class RawSchemaModule<
	resolutions extends RawSchemaResolutions = RawSchemaResolutions
> extends DynamicBase<resolutions> {
	declare readonly [arkKind]: "module"
}

export class RawSchemaScope<
	$ extends RawSchemaResolutions = RawSchemaResolutions
> implements internalImplementationOf<SchemaScope, "infer" | "inferIn" | "$">
{
	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig

	readonly nodeCache: { [innerId: string]: RawNode } = {}
	readonly referencesByName: { [name: string]: RawNode } = {}
	references: readonly RawNode[] = []
	protected readonly resolutions: RawSchemaResolutions = {}
	readonly json: Json = {}
	exportedNames: string[]

	protected resolved = false

	get raw() {
		return this
	}

	constructor(
		/** The set of names defined at the root-level of the scope mapped to their
		 * corresponding definitions.**/
		public aliases: Record<string, unknown>,
		config?: ArkConfig
	) {
		this.config = config ?? {}
		this.resolvedConfig = resolveConfig(config)
		if ($ark.ambient) {
			// ensure exportedResolutions is populated
			$ark.ambient.export()
			this.resolutions = { ...$ark.ambient.resolutions! }
		} else {
			this.resolutions = {}
		}
		this.exportedNames = Object.keys(this.aliases).filter(
			(k) => k[0] !== "#"
		) as never
	}

	static root: RawSchemaScope<{}> = new RawSchemaScope({})

	node<kind extends NodeKind>(
		kind: kind,
		def: unknown,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<kind>> {
		return parseNode(kind, def, this, opts) as never
	}

	schema(def: SchemaDef, opts?: NodeParseOptions): RawSchema {
		return parseNode(schemaKindOf(def), def, this, opts) as never
	}

	defineSchema(def: SchemaDef): SchemaDef {
		return def
	}

	units(values: unknown[], opts?: NodeParseOptions): RawSchema {
		{
			const uniqueValues: unknown[] = []
			for (const value of values) {
				if (!uniqueValues.includes(value)) {
					uniqueValues.push(value)
				}
			}
			const branches = uniqueValues.map((unit) =>
				parseNode("unit", { unit }, this, opts)
			)
			return parseNode("union", branches, this, {
				...opts,
				prereduced: true
			}) as never
		}
	}

	parseNode<kinds extends NodeKind | array<SchemaKind>>(
		kinds: kinds,
		schema: NodeDef<flattenListable<kinds>>,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<flattenListable<kinds>>> {
		return parseNode(kinds, schema, this, opts) as never
	}

	parseRoot(def: unknown, opts?: NodeParseOptions): RawSchema {
		return this.schema(def as never, opts)
	}

	maybeResolve(name: string): RawSchema | GenericSchema | undefined {
		const cached = this.resolutions[name]
		if (cached) {
			return cached
		}
		let def = this.aliases[name]
		if (!def) return this.maybeResolveSubalias(name)
		if (isThunk(def) && !hasArkKind(def, "generic")) {
			def = def()
		}
		// TODO: initialize here?
		const resolution = hasArkKind(def, "generic")
			? validateUninstantiatedGenericNode(def)
			: hasArkKind(def, "module")
				? throwParseError(writeMissingSubmoduleAccessMessage(name))
				: this.schema(def as never, { args: {} })
		this.resolutions[name] = resolution
		return resolution
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	private maybeResolveSubalias(
		name: string
	): RawSchema | GenericSchema | undefined {
		const dotIndex = name.indexOf(".")
		if (dotIndex === -1) {
			return
		}
		const dotPrefix = name.slice(0, dotIndex)
		const prefixDef = this.aliases[dotPrefix]
		if (hasArkKind(prefixDef, "module")) {
			const resolution = prefixDef[name.slice(dotIndex + 1)]
			// if the first part of name is a submodule but the suffix is
			// unresolvable, we can throw immediately
			if (!resolution)
				return throwParseError(writeUnresolvableMessage(name))
			this.resolutions[name] = resolution
			return resolution
		}
		if (prefixDef !== undefined)
			return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))
		// if the name includes ".", but the prefix is not an alias, it
		// might be something like a decimal literal, so just fall through to return
	}

	maybeResolveNode(name: string): RawSchema | undefined {
		const result = this.maybeResolve(name)
		return hasArkKind(result, "schema") ? (result as never) : undefined
	}

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): destructuredImportContext<$, names> {
		return new SchemaModule(
			flatMorph(this.export(...names) as any, (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	#exportedResolutions: RawSchemaResolutions | undefined
	#exportCache: SchemaExportCache | undefined
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): destructuredExportContext<$, names> {
		if (!this.#exportCache) {
			this.#exportCache = {}
			for (const name of this.exportedNames) {
				let def = this.aliases[name]
				if (hasArkKind(def, "generic")) {
					this.#exportCache[name] = def
					continue
				}
				// TODO: thunk generics?
				// handle generics before invoking thunks, since they use
				// varargs they will incorrectly be considered thunks
				if (isThunk(def)) {
					def = def()
				}
				if (hasArkKind(def, "module")) {
					this.#exportCache[name] = def
				} else {
					this.#exportCache[name] = this.parseRoot(def)
				}
			}
			this.#exportedResolutions = resolutionsOfModule(this.#exportCache)
			// TODO: add generic json
			Object.assign(
				this.json,
				flatMorph(this.#exportedResolutions as Dict, (k, v) =>
					hasArkKind(v, "schema") ? [k, v.json] : []
				)
			)
			Object.assign(this.resolutions, this.#exportedResolutions)
			this.references = Object.values(this.referencesByName)
			// this.bindCompiledScope(this.references)
			this.resolved = true
		}
		const namesToExport = names.length ? names : this.exportedNames
		return new SchemaModule(
			flatMorph(namesToExport, (_, name) => [
				name,
				this.#exportCache![name]
			]) as never
		) as never
	}
}

export type destructuredExportContext<$, names extends exportedNameOf<$>[]> = {
	[k in names extends [] ? keyof $ : names[number]]: $[k]
} & unknown

export type destructuredImportContext<$, names extends exportedNameOf<$>[]> = {
	[k in names extends [] ? keyof $ : exportedNameOf<$> as `#${k &
		string}`]: $[k]
} & unknown

export type SchemaExportCache = Record<
	string,
	RawSchema | GenericSchema | RawSchemaModule | undefined
>

const resolutionsOfModule = (typeSet: SchemaExportCache) => {
	const result: RawSchemaResolutions = {}
	for (const k in typeSet) {
		const v = typeSet[k]
		if (hasArkKind(v, "module")) {
			const innerResolutions = resolutionsOfModule(v as never)
			const prefixedResolutions = flatMorph(
				innerResolutions,
				(innerK, innerV) => [`${k}.${innerK}`, innerV]
			)
			Object.assign(result, prefixedResolutions)
		} else if (hasArkKind(v, "generic")) {
			result[k] = v
		} else {
			result[k] = v as RawSchema
		}
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

const bindCompiledSpace = (references: readonly RawNode[]) => {
	const compiledTraversals = compileSpace(references)
	for (const node of references) {
		if (node.jit) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			continue
		}
		node.jit = true
		node.traverseAllows =
			compiledTraversals[`${node.name}Allows`].bind(compiledTraversals)
		if (node.isSchema() && !node.includesContextDependentPredicate) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = node.traverseAllows as never
		}
		node.traverseApply =
			compiledTraversals[`${node.name}Apply`].bind(compiledTraversals)
	}
}

const compileSpace = (references: readonly RawNode[]) => {
	return new CompiledFunction()
		.block("return", (js) => {
			references.forEach((node) => {
				const allowsCompiler = new NodeCompiler("Allows").indent()
				node.compile(allowsCompiler)
				const applyCompiler = new NodeCompiler("Apply").indent()
				node.compile(applyCompiler)
				js.line(
					`${allowsCompiler.writeMethod(`${node.name}Allows`)},`
				).line(`${applyCompiler.writeMethod(`${node.name}Apply`)},`)
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
