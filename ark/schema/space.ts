import {
	CompiledFunction,
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	transform,
	type Dict
} from "@arktype/util"
import type { Node, UnknownNode } from "./base.js"
import { maybeGetBasisKind } from "./bases/basis.js"
import type {
	instantiateAliases,
	instantiateSchemaBranches,
	validateAliases,
	validateSchemaBranch
} from "./inference.js"
import type { keywords } from "./keywords/keywords.js"
import { parse, type SchemaParseOptions } from "./parse.js"
import type { Schema } from "./schema.js"
import type { BranchKind } from "./sets/union.js"
import {
	In,
	type CompilationKind,
	type CompiledMethods
} from "./shared/compilation.js"
import { nodeKinds, type NodeKind, type SchemaKind } from "./shared/define.js"
import type {
	Definition,
	NormalizedDefinition,
	reducibleKindOf
} from "./shared/nodes.js"
import { isNode } from "./shared/registry.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: Schema }

export class Space<keywords extends nodeResolutions<keywords> = any> {
	declare infer: {
		[k in keyof keywords]: keywords[k]["infer"]
	}
	declare static keywords: typeof keywords
	declare static unknownUnion?: Schema<unknown, "union">
	keywords = {} as keywords
	readonly cls = Space
	readonly schemas: readonly Schema[]
	// populated during initial schema parse
	readonly referencesByAlias: Record<string, UnknownNode> = {}
	readonly references: readonly UnknownNode[]
	readonly compilations = {
		allows: {} as Record<string, CompiledMethods["allows"]>,
		traverse: {} as Record<string, CompiledMethods["traverse"]>
	}

	constructor(public aliases: Dict<string, unknown>) {
		this.schemas = Object.entries(this.aliases).map(([k, v]) => {
			const node = this.parseNode(schemaKindOf(v), v as never, {
				alias: k
			})
			// TODO: same alias across multiple nodes?
			Object.assign(this.referencesByAlias, node.contributesReferencesByAlias)
			return node
		})
		this.keywords = transform(this.schemas, (_, v) => [v.alias, v]) as never
		this.references = Object.values(this.referencesByAlias)
		this.compilations = this.getCompilations(this.references)
		if (Space.root && !Space.unknownUnion) {
			// ensure root has been set before parsing this to avoid a circularity
			Space.unknownUnion = this.parsePrereduced("union", [
				"string",
				"number",
				"object",
				"bigint",
				"symbol",
				{ unit: true },
				{ unit: false },
				{ unit: null },
				{ unit: undefined }
			])
		}
	}

	compile<kind extends CompilationKind>(
		node: UnknownNode,
		kind: kind
	): CompiledMethods[kind] {
		const compiledArgs = kind === "allows" ? [In] : [In, "problems"]
		const body = node.compileBody({
			path: [],
			discriminants: [],
			compilationKind: kind
		})
		const fn = new CompiledFunction(...compiledArgs, body).bind(
			this.compilations[kind]
		)
		this.compilations[kind][node.alias] = fn as never
		return fn as never
	}

	private getCompilations(
		references: readonly UnknownNode[]
	): this["compilations"] {
		return {
			allows: new CompiledFunction(
				this.compileMethodKind("allows", references)
			)(),
			traverse: new CompiledFunction(
				this.compileMethodKind("traverse", references)
			)()
		} as never
	}

	private compileMethodKind(
		kind: CompilationKind,
		references: readonly UnknownNode[]
	) {
		return `return {
			${
				references
					.map(
						(reference) => `${reference.alias}(${In}){
					${reference.compileBody({
						compilationKind: kind,
						path: [],
						discriminants: []
					})}
			}`
					)
					.join(",\n") + "}"
			}`
	}

	get builtin() {
		return Space.keywords
	}

	static from = <const aliases>(aliases: validateAliases<aliases>) =>
		new Space<instantiateAliases<aliases>>(aliases as never)

	static root = new Space<{}>({})

	parseJit<kind extends NodeKind>(
		kind: kind,
		def: Definition<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		const node = this.parseNode(kind, def, opts)
		const byAlias = {
			...this.referencesByAlias,
			...node.contributesReferencesByAlias
		}
		const $ = this.getCompilations(Object.values(byAlias)).allows
		node.allows = $[node.alias].bind($)
		return node
	}

	parseUnion<const branches extends readonly Definition<BranchKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], keywords>
			}
		} & NormalizedDefinition<"union">
	): instantiateSchemaBranches<branches> {
		return this.parseNode("union", input) as never
	}

	parseBranches<const branches extends readonly Definition<BranchKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], keywords>
		}
	): instantiateSchemaBranches<branches> {
		return this.parseNode("union", branches as never) as never
	}

	parseUnits<const branches extends readonly unknown[]>(
		...values: branches
	): branches["length"] extends 1
		? Schema<branches[0], "unit">
		: Schema<branches[number], "union" | "unit"> {
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
			return branches[0]
		}
		return this.parsePrereduced("union", {
			branches
		}) as never
	}

	parsePrereduced<kind extends SchemaKind>(
		kind: kind,
		def: Definition<kind>
	): Node<kind> {
		return this.parseNode(kind, def, {
			prereduced: true
		}) as never
	}

	parseSchemaFromKinds<defKind extends SchemaKind>(
		allowedKinds: readonly defKind[],
		def: Definition<defKind>
	): Node<reducibleKindOf<defKind>> {
		const kind = schemaKindOf(def)
		if (!allowedKinds.includes(kind as never)) {
			return throwParseError(
				`Schema of kind ${kind} should be one of ${allowedKinds}`
			)
		}
		return this.parseNode(kind, def as never) as never
	}

	private readonly anonymousTypeCountsByKind = transform(
		nodeKinds,
		(_, kind) => [kind, 0]
	)
	parseNode<kind extends NodeKind>(
		kind: kind,
		def: Definition<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		if (opts.alias && opts.alias in this.referencesByAlias) {
			return throwInternalError(
				`Unexpected attempt to recreate existing alias ${opts.alias}`
			)
		}
		return parse(kind, def, {
			...opts,
			space: this,
			alias: opts.alias ?? `${kind}${++this.anonymousTypeCountsByKind[kind]}`,
			definition: def
		}) as never
	}

	readonly schema = Object.assign(this.parseBranches.bind(this), {
		units: this.parseUnits.bind(this),
		union: this.parseUnion.bind(this),
		prereduced: this.parsePrereduced.bind(this)
	})
}

export const space = Space.from

export const rootSchema = Space.root.schema.bind(Space.root)

export const rootNode = Space.root.parseNode.bind(Space.root)

const schemaKindOf = (input: unknown): SchemaKind => {
	const basisKind = maybeGetBasisKind(input)
	if (basisKind) {
		return basisKind
	}
	if (typeof input === "object" && input !== null) {
		if (isNode(input)) {
			if (input.isSchema()) {
				return input.kind
			}
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
