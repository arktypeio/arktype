import {
	CompiledFunction,
	flatMorph,
	type array,
	type evaluate,
	type requireKeys
} from "@arktype/util"
import type { Node, TypeNode } from "./base.js"
import { mergeConfigs } from "./config.js"
import type { internalKeywords } from "./keywords/internal.js"
import type { jsObjects } from "./keywords/jsObjects.js"
import type { tsKeywords } from "./keywords/tsKeywords.js"
import type { instantiateSchema, validateSchema } from "./parser/inference.js"
import { root, type SchemaParseOptions } from "./parser/parse.js"
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
	TypeKind
} from "./shared/implement.js"
import type { TraverseAllows, TraverseApply } from "./shared/traversal.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: TypeNode }

export type BaseResolutions = Record<string, TypeNode>

declare global {
	export interface StaticArkConfig {
		preserve(): never
	}
}

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
	scopeConfig: ArkConfig | undefined
): ResolvedArkConfig => extendConfig(defaultConfig, scopeConfig) as never

export type PrimitiveKeywords = tsKeywords & jsObjects & internalPrimitive

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
	// 	this.resolved = true
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

export interface TypeSchemaParseOptions<allowedKind extends TypeKind = TypeKind>
	extends SchemaParseOptions {
	root?: boolean
	allowedKinds?: readonly allowedKind[]
}
