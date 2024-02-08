import {
	CompiledFunction,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	type Dict,
	type evaluate,
	type require,
	type requireKeys
} from "@arktype/util"
import type { Node, TypeNode } from "./base.js"
import { globalConfig } from "./config.js"
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
import type {
	DescriptionWriter,
	NodeKind,
	TypeKind
} from "./shared/implement.js"
import type { TraverseAllows, TraverseApply } from "./traversal/context.js"
import type {
	ActualWriter,
	ArkErrorCode,
	ExpectedWriter,
	MessageWriter,
	ProblemWriter
} from "./traversal/errors.js"
import { maybeGetBasisKind } from "./types/basis.js"
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

export type ArkConfig = Partial<NodeConfigsByKind>

export type ParsedArkConfig = require<ArkConfig, 2>

const parseConfig = (scopeConfig: ArkConfig | undefined): ParsedArkConfig => {
	if (!scopeConfig) {
		return globalConfig
	}
	const parsedConfig = { ...globalConfig }
	let kind: keyof ArkConfig
	for (kind in scopeConfig) {
		parsedConfig[kind] = {
			...nodesByKind[kind].implementation.defaults,
			...scopeConfig[kind]
		} as never
	}
	return parsedConfig
}

const assertTypeKind = (input: unknown): TypeKind => {
	const basisKind = maybeGetBasisKind(input)
	if (basisKind) {
		return basisKind
	}
	if (typeof input === "object" && input !== null) {
		if (input instanceof BaseType) {
			return input.kind
			// otherwise, error at end of function
		} else if ("morph" in input) {
			return "morph"
		} else if ("branches" in input || isArray(input)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${printable(input)} is not a valid type schema`)
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

	constructor(
		public def: Dict,
		config: ArkConfig = {}
	) {
		this.config = parseConfig(config)
		for (const k in this.def) {
			;(this.resolutions as BaseResolutions)[k] = this.parseRoot(
				assertTypeKind(this.def[k]),
				this.def[k] as never,
				{
					alias: k
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
			{ reduceTo: this.parse("intersection", {}) }
		)
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

	static root: ScopeNode<{}> = this.from({})

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
		return this.parseRoot("union", branches as never) as never
	}

	parseUnits<const branches extends readonly unknown[]>(
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
			this.parse("unit", { unit }, { prereduced: true })
		)
		if (branches.length === 1) {
			return branches[0] as never
		}
		return this.parseRoot("union", {
			branches
		}) as never
	}

	parseTypeNode<defKind extends TypeKind>(
		schema: Schema<defKind>,
		allowedKinds?: readonly defKind[]
	): Node<reducibleKindOf<defKind>> {
		const kind = assertTypeKind(schema)
		if (allowedKinds && !allowedKinds.includes(kind as never)) {
			return throwParseError(
				`Schema of kind ${kind} should be one of ${allowedKinds}`
			)
		}
		return this.parse(kind, schema as never) as never
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
			this.referencesByName[node.name] = node
		}
		return node
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
			definition: def
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
			if (node.isType() && !node.includesContextDependentPredicate) {
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

export type SchemaParser<r extends object> = {
	<const branches extends readonly Schema<UnionChildKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], r>
		}
	): instantiateSchemaBranches<branches>

	union<const branches extends readonly Schema<UnionChildKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], r>
			}
		} & NormalizedUnionSchema
	): instantiateSchemaBranches<branches>

	units<const branches extends readonly unknown[]>(
		...values: branches
	): branches["length"] extends 1
		? UnionNode<branches[0]>
		: UnionNode<branches[number]> | UnitNode<branches[number]>
}

export const scopeNode = ScopeNode.from

export const rootSchema = ScopeNode.root.schema.bind(ScopeNode.root)

export const rootNode = ScopeNode.root.parse.bind(ScopeNode.root)
