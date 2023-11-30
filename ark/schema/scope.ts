import {
	isArray,
	printable,
	throwInternalError,
	throwParseError,
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
import type { keywords, schema } from "./keywords/keywords.js"
import { parse, type SchemaParseOptions } from "./parse.js"
import type { KeyCheckKind } from "./refinements/props/shared.js"
import type { BranchKind } from "./sets/union.js"
import {
	compileAnonymous,
	compileScope,
	type ProblemCode
} from "./shared/compilation.js"
import type { NodeKind, TypeKind } from "./shared/define.js"
import type {
	NormalizedDefinition,
	Schema,
	reducibleKindOf
} from "./shared/nodes.js"
import { isNode } from "./shared/symbols.js"
import type { TypeNode } from "./type.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: TypeNode }

export const globalResolutions: BaseResolutions = {}

export type BaseResolutions = Record<string, TypeNode>

export interface ArkConfig {
	preserve(): never
}

export type ScopeOptions = {
	codes?: Record<ProblemCode, { mustBe?: string }>
	keys?: KeyCheckKind
}

export class ScopeNode<r extends object = any> {
	declare infer: {
		[k in keyof r]: r[k] extends schema.cast<infer t> ? t : never
	}
	declare static keywords: typeof keywords
	declare static unknownUnion?: TypeNode<unknown, "union">
	readonly cls = ScopeNode
	readonly resolutions = {} as r
	readonly referencesById: Record<string, UnknownNode> = {}
	readonly references: readonly Node[]
	protected resolved = false

	constructor(
		public def: Dict<string, unknown>,
		opts: ScopeOptions = {}
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
		this.references = Object.values(this.resolutions)
		const compiledAllowsTraversals = compileScope(this.references, "allows")
		const compiledApplyTraversals = compileScope(this.references, "apply")
		for (const reference of this.references) {
			reference.traverseAllows = compiledAllowsTraversals[reference.id].bind(
				compiledAllowsTraversals
			)
			if (!reference.includesContextDependentPredicate) {
				// if the reference doesn't require context, we can assign over
				// it directly to avoid having to initialize it
				reference.allows = reference.traverseAllows as never
			}
			reference.traverseApply = compiledApplyTraversals[reference.id].bind(
				compiledApplyTraversals
			)
		}
		this.resolved = true
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
		new ScopeNode<instantiateAliases<aliases>>(aliases)

	static root = this.from({})

	parseUnion<const branches extends readonly Schema<BranchKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], r>
			}
		} & NormalizedDefinition<"union">
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
		? TypeNode<branches[0], "unit">
		: TypeNode<branches[number], "union" | "unit"> {
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

	parsePrereduced<kind extends TypeKind>(
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

	private static typeCountsByPrefix: PartialRecord<string, number> = {}
	parseNode<kind extends NodeKind>(
		kind: kind,
		def: Schema<kind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<kind>> {
		const prefix = opts.alias ?? kind
		ScopeNode.typeCountsByPrefix[prefix] ??= 0
		const id = `${prefix}${++ScopeNode.typeCountsByPrefix[prefix]!}`
		if (opts.alias && opts.alias in this.resolutions) {
			return throwInternalError(
				`Unexpected attempt to recreate existing alias ${opts.alias}`
			)
		}
		const node = parse(kind, def, {
			...opts,
			scope: this,
			definition: def,
			id
		})
		// TODO: centralize
		if (this.resolved) {
			node.traverseAllows = compileAnonymous(node, "allows")
			if (!node.includesContextDependentPredicate) {
				node.allows = node.traverseAllows as never
			}
			node.traverseApply = compileAnonymous(node, "apply")
		} else {
			this.referencesById[id] = node
		}
		return node as never
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

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
	`Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(":")}`

export const writeDuplicateNameMessage = <name extends string>(
	name: name
): writeDuplicateNameMessage<name> => `Duplicate name '${name}'`

type writeDuplicateNameMessage<name extends string> = `Duplicate name '${name}'`

const assertTypeKind = (input: unknown): TypeKind => {
	const basisKind = maybeGetBasisKind(input)
	if (basisKind) {
		return basisKind
	}
	if (typeof input === "object" && input !== null) {
		if (isNode(input)) {
			if (input.isType()) {
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
