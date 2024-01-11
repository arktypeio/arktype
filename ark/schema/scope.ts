import {
	CompiledFunction,
	entriesOf,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	type Dict,
	type evaluate,
	type require
} from "@arktype/util"
import type { Node, TypeNode } from "./base.js"
import type {
	instantiateAliases,
	instantiateSchemaBranches,
	validateAliases,
	validateSchemaBranch
} from "./inference.js"
import type { keywords, schema } from "./keywords/keywords.js"
import { nodesByKind, type Schema, type reducibleKindOf } from "./kinds.js"
import { parse, type SchemaParseOptions } from "./parse.js"
import type {
	NodeExpectedWriter,
	NodeKind,
	PrimitiveKind,
	TypeKind
} from "./shared/define.js"
import type { TraversalContext } from "./traversal/context.js"
import type {
	ArkActualWriter,
	ArkErrorWriter,
	NodeKindWithError
} from "./traversal/errors.js"
import { maybeGetBasisKind } from "./types/basis.js"
import type { Discriminant } from "./types/discriminate.js"
import { BaseType } from "./types/type.js"
import type {
	BranchKind,
	NormalizedUnionSchema,
	UnionNode
} from "./types/union.js"
import type { UnitNode } from "./types/unit.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: TypeNode }

export type BaseResolutions = Record<string, TypeNode>

declare global {
	export interface StaticArkConfig {
		preserve(): never
		errors(): {}
	}
}

type NodeConfigsByKind = {
	[kind in NodeKind]: nodeConfigForKind<kind>
}

type nodeConfigForKind<kind extends NodeKind> = evaluate<
	{
		expected?: NodeExpectedWriter<kind>
	} & (kind extends NodeKindWithError
		? {
				error?: ArkErrorWriter<kind>
				actual?: ArkActualWriter<kind>
			}
		: {})
>

export type NodeConfig<kind extends NodeKind = NodeKind> =
	NodeConfigsByKind[kind]

export type ParsedUnknownNodeConfig = {
	expected: NodeExpectedWriter
	error?: ArkErrorWriter
	actual?: ArkActualWriter
}

for (const [kind, subclass] of entriesOf(nodesByKind)) {
	// TODO: nullish assign default to actual and error
	subclass
}

// export const configure = (config: ArkConfig): ParsedArkConfig => {
// 	return {
// 		descriptions: defaultDescriptionWriters,
// 		codes: defaultErrorsConfig,
// 		keys: "loose"
// 	}
// }

// const config: ArkConfig = {
// 	codes: {
// 		divisor: {
// 			expected: (ctx) => `divisible by ${ctx.divisor}`,
// 			message: (ctx) => `Must be ${ctx.expected} (was ${ctx.data})`
// 		}
// 	}
// }

export type StaticArkOption<k extends keyof StaticArkConfig> = ReturnType<
	StaticArkConfig[k]
>

export type KeyCheckKind = "distilled" | "strict" | "loose"

export type ArkConfig = Partial<NodeConfigsByKind>

export type ParsedArkConfig = require<ArkConfig, 2>

export class ScopeNode<r extends object = any> {
	declare infer: {
		[k in keyof r]: r[k] extends schema.cast<infer t> ? t : never
	}
	declare static keywords: typeof keywords
	readonly resolutions = {} as r
	readonly referencesById: Record<string, Node> = {}
	readonly references: readonly Node[]
	protected resolved = false

	constructor(
		public def: Dict<string, unknown>,
		public opts: ArkConfig = {}
	) {
		for (const k in this.def) {
			;(this.resolutions as BaseResolutions)[k] = this.parseNode(
				assertTypeKind(this.def[k]),
				this.def[k] as never,
				{
					alias: k
				}
			)
		}
		this.references = Object.values(this.referencesById)
		this.bindCompiledScope(this.references, this.references)
		this.resolved = true
		if (ScopeNode.keywords) {
			// ensure root has been set before parsing this to avoid a circularity
			this.parseNode(
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
				{ reduceTo: ScopeNode.keywords.unknown }
			)
		}
	}

	get builtin() {
		return ScopeNode.keywords
	}

	static from<const aliases>(
		aliases: validateAliases<aliases>
	): ScopeNode<instantiateAliases<aliases>> {
		return new ScopeNode(aliases)
	}

	static root: ScopeNode<{}> = this.from({})

	parseUnion<const branches extends readonly Schema<BranchKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], r>
			}
		} & NormalizedUnionSchema
	): instantiateSchemaBranches<branches> {
		return this.parseNode("union", input) as never
	}

	parseBranches<const branches extends readonly Schema<BranchKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], r>
		}
	): instantiateSchemaBranches<branches> {
		return this.parseNode("union", branches as never) as never
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
			this.parsePrereduced("unit", { unit })
		)
		if (branches.length === 1) {
			return branches[0] as never
		}
		return this.parsePrereduced("union", {
			branches
		}) as never
	}

	parsePrereduced<kind extends NodeKind>(
		kind: kind,
		def: Schema<kind>
	): Node<kind> {
		return this.parseNode(kind, def, {
			prereduced: true
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
		return this.parseNode(kind, schema as never) as never
	}

	parseNode<kind extends NodeKind>(
		kind: kind,
		def: Schema<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		if (opts.alias && opts.alias in this.resolutions) {
			return throwInternalError(
				`Unexpected attempt to recreate existing alias ${opts.alias}`
			)
		}
		const node = parse(kind, def, {
			...opts,
			$: this,
			definition: def
		})
		if (this.resolved) {
			// this node was not part of the original scope, so compile an anonymous scope
			// including only its references
			this.bindCompiledScope([node], node.contributesReferences)
		} else {
			// we're still parsing the scope itself, so defer compilation but
			// add the node as a reference
			this.referencesById[node.id] = node
		}
		return node as never
	}

	readonly dataName = "data"
	readonly ctxName = "ctx"

	protected bindCompiledScope(
		nodesToBind: readonly Node[],
		references: readonly Node[]
	) {
		const compiledAllowsTraversals = this.compileScope(references, "allows")
		const compiledApplyTraversals = this.compileScope(references, "apply")
		for (const node of nodesToBind) {
			node.traverseAllows = compiledAllowsTraversals[node.id].bind(
				compiledAllowsTraversals
			)
			if (node.isType() && !node.includesContextDependentPredicate) {
				// if the reference doesn't require context, we can assign over
				// it directly to avoid having to initialize it
				node.allows = node.traverseAllows as never
			}
			node.traverseApply = compiledApplyTraversals[node.id].bind(
				compiledApplyTraversals
			)
		}
	}

	protected compileScope<kind extends TraversalKind>(
		references: readonly Node[],
		kind: kind
	): Record<string, TraversalMethodsByKind[kind]> {
		const compiledArgs =
			kind === "allows" ? this.dataName : `${this.dataName}, errors`
		const body = `return {
	${references
		.map(
			(reference) => `${reference.id}(${compiledArgs}){
${reference.compileBody({
	argName: this.dataName,
	compilationKind: kind,
	path: [],
	discriminants: []
})}
}`
		)
		.join(",\n")}
}`
		return new CompiledFunction(body)() as never
	}

	compilePrimitive(node: Node<PrimitiveKind>, ctx: CompilationContext) {
		const pathString = ctx.path.join()
		if (
			node.kind === "domain" &&
			node.domain === "object" &&
			ctx.discriminants.some((d) => d.path.join().startsWith(pathString))
		) {
			// if we've already checked a path at least as long as the current one,
			// we don't need to revalidate that we're in an object
			return ""
		}
		if (
			(node.kind === "domain" || node.kind === "unit") &&
			ctx.discriminants.some(
				(d) =>
					d.path.join() === pathString &&
					(node.kind === "domain"
						? d.kind === "domain" || d.kind === "value"
						: d.kind === "value")
			)
		) {
			// if the discriminant has already checked the domain at the current path
			// (or an exact value, implying a domain), we don't need to recheck it
			return ""
		}
		return ctx.compilationKind === "allows"
			? `return ${node.compiledCondition}`
			: `if (${node.compiledNegation}) {
	${this.compilePrimitiveProblem(node)}
}`
	}

	compilePrimitiveProblem(node: Node<PrimitiveKind>) {
		return `${this.ctxName}.addError(${JSON.stringify(node.expected)})`
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
	<const branches extends readonly Schema<BranchKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], r>
		}
	): instantiateSchemaBranches<branches>

	union<const branches extends readonly Schema<BranchKind>[]>(
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

export const rootNode = ScopeNode.root.parseNode.bind(ScopeNode.root)

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

export type TraversalKind = keyof TraversalMethodsByKind

type TraversalMethodsByKind<input = unknown> = {
	allows: TraverseAllows<input>
	apply: TraverseApply<input>
}

export type TraverseAllows<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => boolean

export type TraverseApply<data = unknown> = (
	data: data,
	ctx: TraversalContext
) => void

export type CompilationContext = {
	argName: string
	path: string[]
	discriminants: Discriminant[]
	compilationKind: TraversalKind
}
