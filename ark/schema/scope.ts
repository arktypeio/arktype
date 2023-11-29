import {
	isArray,
	printable,
	throwInternalError,
	throwParseError,
	transform,
	type Dict,
	type PartialRecord
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
import type { NodeKind, SchemaKind } from "./shared/define.js"
import type {
	Definition,
	NormalizedDefinition,
	reducibleKindOf
} from "./shared/nodes.js"
import { isNode } from "./shared/registry.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: Schema }

export const globalResolutions: Record<string, Node> = {}

// TODO: SWITCH TO EXPORT MODEL TO MIRROR TYPE, SOLVE CYCLIC COMPILATION 🚀💪⛵
export class ScopeNode<keywords extends nodeResolutions<keywords> = any> {
	declare infer: {
		[k in keyof keywords]: keywords[k]["infer"]
	}
	declare static keywords: typeof keywords
	declare static unknownUnion?: Schema<unknown, "union">
	keywords = {} as keywords
	readonly cls = ScopeNode
	readonly schemas: readonly Schema[]
	// populated during initial schema parse
	readonly referencesById: Record<string, UnknownNode> = {}
	readonly references: readonly UnknownNode[]

	constructor(public aliases: Dict<string, unknown>) {
		this.schemas = Object.entries(this.aliases).map(([k, v]) => {
			const node = this.parseNode(schemaKindOf(v), v as never, {
				alias: k
			})
			Object.assign(this.referencesById, node.contributesReferencesById)
			return node
		})
		this.keywords = transform(this.schemas, (_, v) => [v.alias!, v]) as never
		this.references = Object.values(this.referencesById)
		if (ScopeNode.root && !ScopeNode.unknownUnion) {
			// ensure root has been set before parsing this to avoid a circularity
			ScopeNode.unknownUnion = this.parsePrereduced("union", [
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

	get builtin() {
		return ScopeNode.keywords
	}

	static from = <const aliases>(aliases: validateAliases<aliases>) =>
		new ScopeNode<instantiateAliases<aliases>>(aliases as never)

	static root = new ScopeNode<{}>({})

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

	private static typeCountsByPrefix: PartialRecord<string, number> = {}
	parseNode<kind extends NodeKind>(
		kind: kind,
		def: Definition<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		const prefix = opts.alias ?? kind
		ScopeNode.typeCountsByPrefix[prefix] ??= 0
		const uuid = `${prefix}${++ScopeNode.typeCountsByPrefix[prefix]!}`
		if (opts.alias && opts.alias in this.keywords) {
			return throwInternalError(
				`Unexpected attempt to recreate existing alias ${opts.alias}`
			)
		}
		return parse(kind, def, {
			...opts,
			scope: this,
			definition: def,
			id: uuid
		}) as never
	}

	readonly schema = Object.assign(this.parseBranches.bind(this), {
		units: this.parseUnits.bind(this),
		union: this.parseUnion.bind(this),
		prereduced: this.parsePrereduced.bind(this)
	})
}

export const scopeNode = ScopeNode.from

export const rootSchema = ScopeNode.root.schema.bind(ScopeNode.root)

export const rootNode = ScopeNode.root.parseNode.bind(ScopeNode.root)

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
