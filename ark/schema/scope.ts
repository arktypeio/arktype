import {
	CompiledFunction,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	type Dict,
	type List,
	type evaluate,
	type require,
	type requireKeys
} from "@arktype/util"
import type { Node, TypeNode } from "./base.js"
import { globalConfig } from "./config.js"
import type { LengthBoundableData } from "./constraints/refinements/range.js"
import type {
	instantiateAliases,
	instantiateSchemaBranches,
	validateAliases,
	validateSchemaBranch
} from "./inference.js"
import type { keywords, schema } from "./keywords/keywords.js"
import { nodesByKind, type Schema, type reducibleKindOf } from "./kinds.js"
import { parseAttachments, type SchemaParseOptions } from "./parse.js"
import { NodeCompiler } from "./shared/compile.js"
import type { TraverseAllows, TraverseApply } from "./shared/context.js"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./shared/errors.js"
import type { DescriptionWriter, NodeKind } from "./shared/implement.js"
import { BaseType } from "./types/type.js"
import type {
	NormalizedUnionSchema,
	UnionChildKind,
	UnionNode
} from "./types/union.js"
import type { UnitNode } from "./types/unit.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: TypeNode }

export type BaseResolutions = Record<string, TypeNode>

declare global {
	export interface StaticArkConfig {
		preserve(): never
	}
}

type nodeConfigForKind<kind extends NodeKind> = evaluate<
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

export interface ArkConfig extends Partial<NodeConfigsByKind> {
	/** @internal */
	prereducedAliases?: boolean
	/** @internal */
	prereducedSchemas?: boolean
}

export type ParsedArkConfig = require<ArkConfig, 2>

const parseConfig = (scopeConfig: ArkConfig | undefined): ParsedArkConfig => {
	if (!scopeConfig) {
		return globalConfig
	}
	const parsedConfig = { ...globalConfig }
	let k: keyof ArkConfig
	for (k in scopeConfig) {
		if (k === "prereducedAliases" || k === "prereducedSchemas") {
			parsedConfig[k] = scopeConfig[k]!
		} else {
			parsedConfig[k] = {
				...nodesByKind[k].implementation.defaults,
				...scopeConfig[k]
			} as never
		}
	}
	return parsedConfig
}

const assertTypeKind = (schema: unknown): NodeKind => {
	switch (typeof schema) {
		case "string":
			return "domain"
		case "function":
			return "proto"
		case "object":
			if (schema === null) {
				// throw at end of function
			} else if (schema instanceof BaseType) {
				return schema.kind
			} else if ("morph" in schema) {
				return "morph"
			} else if ("branches" in schema || isArray(schema)) {
				return "union"
			} else if ("unit" in schema) {
				return "unit"
			} else {
				// if the schema has a proto or domain key, it will be parsed as an
				// IntersectionNode, but reduced to the basis if there are no
				// constraints
				return "intersection"
			}
	}
	return throwParseError(`${printable(schema)} is not a valid type schema`)
}

export class ScopeNode<r extends object = any> {
	declare infer: {
		[k in keyof r]: r[k] extends schema.cast<infer t> ? t : never
	}
	declare static keywords: typeof keywords

	readonly nodeCache: { [innerId: string]: Node } = {}
	readonly config: ParsedArkConfig
	readonly resolutions = {} as r
	readonly referencesByName: { [name: string]: Node } = {}
	readonly references: readonly Node[]
	protected resolved = false
	protected prereducedAliases: boolean
	protected prereducedSchemas: boolean
	readonly lengthBoundable: UnionNode<LengthBoundableData>

	constructor(
		public def: Dict,
		config: ArkConfig = {}
	) {
		this.config = parseConfig(config)
		this.prereducedAliases = config.prereducedAliases ?? false
		this.prereducedSchemas = config.prereducedSchemas ?? false
		for (const k in this.def) {
			;(this.resolutions as BaseResolutions)[k] = this.parseRoot(
				assertTypeKind(this.def[k]),
				this.def[k] as never,
				{
					alias: k,
					prereduced: this.prereducedAliases
				}
			)
		}
		this.references = Object.values(this.referencesByName)
		this.bindCompiledScope(this.references)
		this.resolved = true
		this.parse(
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
					{ unit: null },
					{ unit: undefined }
				]
			},
			{ reduceTo: this.parsePrereduced("intersection", {}) }
		)
		this.lengthBoundable = this.parsePrereduced("union", {
			branches: [this.builtin.string, this.builtin.Array]
		})
	}

	get builtin() {
		return ScopeNode.keywords
	}

	static from<const aliases>(
		aliases: validateAliases<aliases>,
		config: ArkConfig = {}
	): ScopeNode<instantiateAliases<aliases>> {
		return new ScopeNode(aliases, config)
	}

	static root: ScopeNode<{}> = this.from(
		{},
		{ prereducedAliases: true, prereducedSchemas: true }
	)

	parseUnion<const branches extends readonly Schema<UnionChildKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], r>
			}
		} & NormalizedUnionSchema
	): instantiateSchemaBranches<branches> {
		return this.parseRoot("union", input) as never
	}

	parseBranches<const branches extends readonly Schema<UnionChildKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], r>
		}
	): instantiateSchemaBranches<branches> {
		return branches.length === 1
			? (this.parseTypeNode(branches[0] as never, { root: true }) as never)
			: (this.parseRoot("union", branches as never) as never)
	}

	parseUnits<const branches extends List>(
		...values: branches
	): branches["length"] extends 1
		? UnionNode<branches[0]>
		: UnionNode<branches[number]> | UnitNode<branches[number]> {
		const uniqueValues: unknown[] = []
		for (const value of values) {
			if (!uniqueValues.includes(value)) {
				uniqueValues.push(value)
			}
		}
		const branches = uniqueValues.map((unit) =>
			this.parsePrereduced("unit", { unit })
		)
		if (branches.length === 1) {
			return branches[0] as never
		}
		return this.parseRoot("union", {
			branches
		}) as never
	}

	parseTypeNode<defKind extends NodeKind>(
		schema: Schema<defKind>,
		opts: TypeSchemaParseOptions<defKind> = {}
	): Node<reducibleKindOf<defKind>> {
		const kind = assertTypeKind(schema)
		if (opts.allowedKinds && !opts.allowedKinds.includes(kind as never)) {
			return throwParseError(
				`Schema of kind ${kind} should be one of ${opts.allowedKinds}`
			)
		}
		return opts.root
			? (this.parseRoot(kind, schema as never, opts) as never)
			: (this.parse(kind, schema as never, opts) as never)
	}

	parseRoot<kind extends NodeKind>(
		kind: kind,
		def: Schema<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		const node = this.parse(kind, def, opts)
		if (this.resolved) {
			// this node was not part of the original scope, so compile an anonymous scope
			// including only its references
			this.bindCompiledScope(node.contributesReferences)
		} else {
			// we're still parsing the scope itself, so defer compilation but
			// add the node as a reference
			Object.assign(this.referencesByName, node.contributesReferencesByName)
		}
		return node
	}

	parsePrereduced<kind extends NodeKind>(
		kind: kind,
		def: Schema<kind>
	): Node<kind> {
		return this.parse(kind, def, { prereduced: true }) as never
	}

	parse<kind extends NodeKind>(
		kind: kind,
		def: Schema<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		if (opts.alias && opts.alias in this.resolutions) {
			return throwInternalError(
				`Unexpected attempt to recreate existing alias ${opts.alias}`
			)
		}
		const node = parseAttachments(kind, def, {
			...opts,
			$: this,
			definition: def,
			prereduced: (this.prereducedSchemas || opts.prereduced) ?? false
		})
		return node as never
	}

	protected bindCompiledScope(references: readonly Node[]) {
		const compiledTraversals = this.compileScope(references)
		for (const node of references) {
			if (node.jit) {
				// if node has already been bound to another scope or anonymous type, don't rebind it
				continue
			}
			node.jit = true
			node.traverseAllows =
				compiledTraversals[`${node.name}Allows`].bind(compiledTraversals)
			if (node.isSet() && !node.includesContextDependentPredicate) {
				// if the reference doesn't require context, we can assign over
				// it directly to avoid having to initialize it
				node.allows = node.traverseAllows as never
			}
			node.traverseApply =
				compiledTraversals[`${node.name}Apply`].bind(compiledTraversals)
		}
	}

	protected compileScope(references: readonly Node[]) {
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

	readonly schema: SchemaParser<r> = Object.assign(
		this.parseBranches.bind(this),
		{
			units: this.parseUnits.bind(this),
			union: this.parseUnion.bind(this)
		}
	) as never
}

export type SchemaParser<$> = {
	<const branches extends readonly Schema<UnionChildKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], $>
		}
	): instantiateSchemaBranches<branches>

	union<const branches extends readonly Schema<UnionChildKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], $>
			}
		} & NormalizedUnionSchema
	): instantiateSchemaBranches<branches>

	units<const branches extends List>(
		...values: branches
	): branches["length"] extends 1
		? UnionNode<branches[0]>
		: UnionNode<branches[number]> | UnitNode<branches[number]>
}

export interface TypeSchemaParseOptions<allowedKind extends NodeKind = NodeKind>
	extends SchemaParseOptions {
	root?: boolean
	allowedKinds?: readonly allowedKind[]
}

export const scopeNode = ScopeNode.from

export const rootSchema = ScopeNode.root.schema.bind(ScopeNode.root)

export const rootNode = ScopeNode.root.parse.bind(ScopeNode.root)
