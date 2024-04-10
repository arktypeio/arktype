import {
	CompiledFunction,
	type Dict,
	type Json,
	type array,
	type evaluate,
	flatMorph,
	type flattenListable,
	type instantiate,
	isThunk,
	type requireKeys,
	throwParseError
} from "@arktype/util"
import type { BaseNode, Node, Schema, SchemaDef } from "./base.js"
import { mergeConfigs } from "./config.js"
import {
	type GenericSchema,
	validateUninstantiatedGenericNode
} from "./generic.js"
import type { Ark } from "./keywords/keywords.js"
import type { NodeDef, reducibleKindOf } from "./kinds.js"
import type { BaseSchema } from "./main.js"
import { SchemaModule } from "./module.js"
import type { inferSchema, validateSchema } from "./parser/inference.js"
import {
	type NodeParseOptions,
	parseNode,
	schemaKindOf
} from "./parser/parse.js"
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
import { hasArkKind } from "./shared/utils.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: Schema }

export type BaseResolutions = Record<string, Schema>

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

export type SchemaScopeResolutions = Record<
	string,
	Schema | GenericSchema | undefined
>

export type exportedNameOf<$> = Exclude<keyof $ & string, PrivateDeclaration>

export type PrivateDeclaration<key extends string = string> = `#${key}`

export class SchemaScope<$ = any> {
	declare $: $
	declare infer: distillOut<$>
	declare inferIn: distillIn<$>
	declare hktNode: BaseSchema
	declare hktModule: SchemaModule
	declare hktGeneric: GenericSchema

	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig

	readonly nodeCache: { [innerId: string]: BaseNode } = {}
	readonly referencesByName: { [name: string]: BaseNode } = {}
	references: readonly BaseNode[] = []
	readonly resolutions: SchemaScopeResolutions = {}
	readonly json: Json = {}
	exportedNames: array<exportedNameOf<$>>

	protected resolved = false

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

	static root: SchemaScope<{}> = new SchemaScope({})

	node<kind extends NodeKind, const def extends NodeDef<kind>>(
		kind: kind,
		def: def,
		opts?: NodeParseOptions
	): Node<reducibleKindOf<kind>> {
		return parseNode(kind, def, this, opts) as never
	}

	schema<const def extends SchemaDef>(
		def: def,
		opts?: NodeParseOptions
	): instantiate<this["hktNode"], [inferSchema<def, $>, $]> {
		return parseNode(schemaKindOf(def), def, this, opts) as never
	}

	defineSchema<const def extends SchemaDef>(def: def): def {
		return def
	}

	units<const branches extends array>(
		values: branches,
		opts?: NodeParseOptions
	): instantiate<this["hktNode"], [branches[number], $]> {
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

	parseRoot(def: unknown, opts?: NodeParseOptions): Schema {
		return this.schema(def as never, opts)
	}

	maybeResolve(name: string): Schema | GenericSchema | undefined {
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
	): Schema | GenericSchema | undefined {
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

	maybeResolveNode(name: string): Schema | undefined {
		const result = this.maybeResolve(name)
		return hasArkKind(result, "schema") ? (result as never) : undefined
	}

	import<names extends exportedNameOf<$>[]>(
		...names: names
	): instantiate<
		this["hktModule"],
		destructuredImportContext<
			$,
			names extends [] ? exportedNameOf<$> : names[number]
		>
	> {
		return new SchemaModule(
			flatMorph(this.export(...names) as any, (alias, value) => [
				`#${alias}`,
				value
			]) as never
		) as never
	}

	#exportedResolutions: SchemaScopeResolutions | undefined
	#exportCache: SchemaExportCache | undefined
	export<names extends exportedNameOf<$>[]>(
		...names: names
	): instantiate<
		this["hktModule"],
		destructuredExportContext<
			$,
			names extends [] ? exportedNameOf<$> : names[number]
		>
	> {
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

export type destructuredExportContext<$, name extends exportedNameOf<$>> = {
	[k in name]: $[k]
} & unknown

export type destructuredImportContext<$, name extends exportedNameOf<$>> = {
	[k in name as `#${k & string}`]: $[k]
} & unknown

export type SchemaExportCache = Record<
	string,
	Schema | GenericSchema | SchemaModule | undefined
>

const resolutionsOfModule = (typeSet: SchemaExportCache) => {
	const result: SchemaScopeResolutions = {}
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
			result[k] = v as Schema
		}
	}
	return result
}

export const root: SchemaScope<{}> = new SchemaScope({})

export const { schema, defineSchema, node, units } = root

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

const bindCompiledSpace = (references: readonly BaseNode[]) => {
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

const compileSpace = (references: readonly BaseNode[]) => {
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

export type validateAliases<aliases> = {
	[k in keyof aliases]: validateSchema<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: inferSchema<aliases[k], aliases>
} & unknown

export declare const schemaScope: <const aliases>(
	aliases: validateAliases<aliases>,
	config?: ArkConfig
) => SchemaScope<instantiateAliases<aliases>>
