import {
	CompiledFunction,
	flatMorph,
	isThunk,
	throwParseError,
	type array,
	type Dict,
	type evaluate,
	type Json,
	type requireKeys
} from "@arktype/util"
import type { Node, TypeNode, UnknownNode } from "./base.js"
import { mergeConfigs } from "./config.js"
import type { Ark } from "./keywords/keywords.js"
import type { instantiateSchema, validateSchema } from "./parser/inference.js"
import { root } from "./parser/parse.js"
import { NodeCompiler } from "./shared/compile.js"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.js"
import type { DescriptionWriter, NodeKind } from "./shared/implement.js"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.js"
import { addArkKind, hasArkKind } from "./shared/utils.js"
import type { distillIn, distillOut } from "./types/morph.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: TypeNode }

export type BaseResolutions = Record<string, TypeNode>

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
	flatMorph($ark.nodeClassesByKind, (kind, node) => [
		kind,
		node.implementation.defaults
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

export type SpaceResolutions = Record<string, TypeNode | undefined>

export type SpaceInput = {
	exports: Dict
	locals?: Dict
	config?: ArkConfig
}

export class BaseScope<$ = any> {
	declare infer: distillOut<$>
	declare inferIn: distillIn<$>

	readonly config: ArkConfig
	readonly resolvedConfig: ResolvedArkConfig

	readonly nodeCache: { [innerId: string]: UnknownNode } = {}
	readonly referencesByName: { [name: string]: UnknownNode } = {}
	readonly references: readonly UnknownNode[] = []
	readonly resolutions: SpaceResolutions = {}
	readonly json: Json = {}
	/** The set of names defined at the root-level of the scope mapped to their
	 * corresponding definitions.**/
	readonly aliases: Record<string, unknown>

	protected resolved = false

	constructor(input: SpaceInput) {
		this.config = input.config ?? {}
		this.resolvedConfig = resolveConfig(input.config)
		if ($ark.ambient) {
			// ensure exportedResolutions is populated
			$ark.ambient.export()
			this.resolutions = { ...$ark.ambient.resolutions! }
		} else {
			this.resolutions = {}
		}
		this.aliases = input.locals
			? { ...input.locals, ...input.exports }
			: input.exports
	}

	maybeResolve(name: string): TypeNode | Generic | undefined {
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
			? validateUninstantiatedGeneric(def)
			: hasArkKind(def, "module")
			? throwParseError(writeMissingSubmoduleAccessMessage(name))
			: this.parseTypeRoot(def, { baseName: name, args: {} })
		this.resolutions[name] = resolution
		return resolution
	}

	/** If name is a valid reference to a submodule alias, return its resolution  */
	private maybeResolveSubalias(name: string): TypeNode | Generic | undefined {
		const dotIndex = name.indexOf(".")
		if (dotIndex === -1) {
			return
		}
		const dotPrefix = name.slice(0, dotIndex)
		const prefixDef = this.aliases[dotPrefix]
		if (hasArkKind(prefixDef, "module")) {
			const resolution = prefixDef[name.slice(dotIndex + 1)]?.root
			// if the first part of name is a submodule but the suffix is
			// unresolvable, we can throw immediately
			if (!resolution) {
				return throwParseError(writeUnresolvableMessage(name))
			}
			this.resolutions[name] = resolution
			return resolution
		}
		if (prefixDef !== undefined) {
			return throwParseError(writeNonSubmoduleDotMessage(dotPrefix))
		}
		// if the name includes ".", but the prefix is not an alias, it
		// might be something like a decimal literal, so just fall through to return
	}

	maybeResolveNode(name: string): TypeNode | undefined {
		const result = this.maybeResolve(name)
		return hasArkKind(result, "node") ? (result as never) : undefined
	}

	protected rawImport(...names: string[]): unknown {
		return addArkKind(
			flatMorph(this.rawExport(...names) as Dict, (alias, value) => [
				`#${alias}`,
				value
			]) as never,
			"module"
		) as never
	}

	private exportedResolutions: SpaceResolutions | undefined
	private exportCache: ExportCache | undefined
	protected rawExport(...names: string[]): unknown {
		if (!this.exportCache) {
			this.exportCache = {}
			for (const name of this.exportedNames) {
				let def = this.aliases[name]
				if (hasArkKind(def, "generic")) {
					this.exportCache[name] = def
					continue
				}
				// TODO: thunk generics?
				// handle generics before invoking thunks, since they use
				// varargs they will incorrectly be considered thunks
				if (isThunk(def)) {
					def = def()
				}
				if (hasArkKind(def, "module")) {
					this.exportCache[name] = def
				} else {
					this.exportCache[name] = new Type(
						this.parseTypeRoot(def, {
							baseName: name,
							args: {}
						}),
						this
					)
				}
			}
			this.exportedResolutions = resolutionsOfModule(this.exportCache)
			// TODO: add generic json
			this.json = flatMorph(this.exportedResolutions, (k, v) =>
				hasArkKind(v, "node") ? [k, v.json] : []
			)
			Object.assign(this.resolutions, this.exportedResolutions)
			this.references = Object.values(this.referencesByName)
			// this.bindCompiledScope(this.references)
			this.resolved = true
		}
		const namesToExport = names.length ? names : this.exportedNames
		return addArkKind(
			flatMorph(namesToExport, (_, name) => [
				name,
				this.exportCache![name]
			]) as never,
			"module"
		) as never
	}
}

const bindCompiledSpace = (references: readonly Node[]) => {
	const compiledTraversals = compileSpace(references)
	for (const node of references) {
		if (node.jit) {
			// if node has already been bound to another scope or anonymous type, don't rebind it
			continue
		}
		node.jit = true
		node.traverseAllows =
			compiledTraversals[`${node.name}Allows`].bind(compiledTraversals)
		if (node.isType() && !node.includesContextDependentPredicate) {
			// if the reference doesn't require context, we can assign over
			// it directly to avoid having to initialize it
			node.allows = node.traverseAllows as never
		}
		node.traverseApply =
			compiledTraversals[`${node.name}Apply`].bind(compiledTraversals)
	}
}

const compileSpace = (references: readonly Node[]) => {
	return new CompiledFunction()
		.block(`return`, (js) => {
			references.forEach((node) => {
				const allowsCompiler = new NodeCompiler("Allows").indent()
				node.compile(allowsCompiler)
				const applyCompiler = new NodeCompiler("Apply").indent()
				node.compile(applyCompiler)
				js.line(
					allowsCompiler.writeMethod(`${node.name}Allows`) +
						",\n" +
						applyCompiler.writeMethod(`${node.name}Apply`) +
						","
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

export type validateAliases<aliases> = {
	[k in keyof aliases]: validateSchema<aliases[k], aliases>
}

export type instantiateAliases<aliases> = {
	[k in keyof aliases]: instantiateSchema<aliases[k], aliases>
} & unknown

export const space = <const aliases>(
	aliases: validateAliases<aliases>,
	config: ArkConfig = {}
): instantiateAliases<aliases> => {
	const resolutions: BaseResolutions = {}
	const referencesByName: { [name: string]: Node } = {}
	const resolvedConfig = resolveConfig(config)
	for (const k in aliases) {
		const node = root(aliases[k] as any, {
			alias: k,
			prereduced: resolvedConfig.prereducedAliases
		})

		resolutions[k] = node
		Object.assign(referencesByName, node.referencesByName)
	}
	const references = Object.values(referencesByName)
	// 	this.bindCompiledScope(this.references)
	// 	this.parse(
	// 		"union",
	// 		{
	// 			branches: [
	// 				"string",
	// 				"number",
	// 				"object",
	// 				"bigint",
	// 				"symbol",
	// 				{ unit: true },
	// 				{ unit: false },
	// 				{ unit: null },
	// 				{ unit: undefined }
	// 			]
	// 		},
	// 		{ reduceTo: this.parsePrereduced("intersection", {}) }
	// 	)
	return resolutions as never
}
