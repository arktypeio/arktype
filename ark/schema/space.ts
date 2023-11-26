import {
	CompiledFunction,
	entriesOf,
	hasDomain,
	includes,
	isArray,
	printable,
	throwParseError,
	transform,
	type Dict
} from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type UnknownNode
} from "./base.js"
import { maybeGetBasisKind } from "./bases/basis.js"
import type {
	instantiateAliases,
	instantiateSchemaBranches,
	validateAliases,
	validateSchemaBranch
} from "./inference.js"
import type { keywords } from "./keywords/keywords.js"
import { SchemaNode, type Schema } from "./schema.js"
import type { BranchKind } from "./sets/union.js"
import { In, type CompilationKind } from "./shared/compilation.js"
import {
	defaultInnerKeySerializer,
	refinementKinds,
	schemaKinds,
	type NodeKind,
	type SchemaKind,
	type SchemaParseContext,
	type SchemaParseContextInput,
	type UnknownNodeImplementation
} from "./shared/define.js"
import {
	NodeImplementationByKind,
	type Definition,
	type NormalizedDefinition,
	type reducibleKindOf
} from "./shared/nodes.js"
import { isNode } from "./shared/registry.js"

export type nodeResolutions<keywords> = { [k in keyof keywords]: Schema }

export class Space<keywords extends nodeResolutions<keywords> = any> {
	declare infer: {
		[k in keyof keywords]: keywords[k]["infer"]
	}
	private declare static unknownUnion?: Schema<unknown, "union">
	declare static keywords: typeof keywords
	keywords = {} as keywords

	readonly schemas: readonly Schema[]
	readonly referencesById: Record<string, UnknownNode>
	readonly references: readonly UnknownNode[]
	readonly allowsOf: <alias extends keyof keywords>(
		alias: alias
	) => keywords[alias]["allows"]
	readonly traverseOf: <alias extends keyof keywords>(
		alias: alias
	) => keywords[alias]["traverse"]

	private constructor(aliases: Dict<string, Definition<SchemaKind>>) {
		this.keywords = transform(aliases, ([k, v]) => [
			k,
			this.schemaFromKinds(schemaKinds, v)
		]) as never
		this.schemas = Object.values(this.keywords)
		this.referencesById = this.schemas.reduce(
			(result, child) => Object.assign(result, child.contributesReferencesById),
			{}
		)
		this.references = Object.values(this.referencesById)
		this.allowsOf = this.compile("allows")
		this.traverseOf = this.compile("traverse")
		if (Space.root && !Space.unknownUnion) {
			// ensure root has been set before parsing this to avoid a circularity
			Space.unknownUnion = this.prereduced("union", [
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

	compile<kind extends CompilationKind>(kind: kind): this[`${kind}Of`] {
		const $ = `const $ = {
			${this.references
				.map((reference) =>
					reference.compileReference({
						compilationKind: kind,
						path: [],
						discriminants: []
					})
				)
				.join(",\n")}
				}`
		if (kind === "allows") {
			return new CompiledFunction(
				"$arkAlias",
				`${$}
return $[arkAlias]`
			) as never
		}
		return new CompiledFunction(
			"$arkAlias",
			`${$}
	return (${In}) => {
		const problems = []
		$[$arkAlias](${In}, problems)
		if(problems.length === 0) {
			return { data: ${In} }
		}
		return { problems }
	}`
		) as never
	}

	get builtin() {
		return Space.keywords
	}

	static from = <const aliases>(aliases: validateAliases<aliases>) =>
		new Space<instantiateAliases<aliases>>(aliases as never)

	static root = new Space<{}>({})

	union<const branches extends readonly Definition<BranchKind>[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], keywords>
			}
		} & NormalizedDefinition<"union">
	): instantiateSchemaBranches<branches> {
		return this.node("union", input, { scope: this }) as never
	}

	branches<const branches extends readonly Definition<BranchKind>[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], keywords>
		}
	): instantiateSchemaBranches<branches> {
		return this.node("union", branches as never) as never
	}

	units<const branches extends readonly unknown[]>(
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
			this.prereduced("unit", { unit })
		)
		if (branches.length === 1) {
			return branches[0]
		}
		return this.prereduced("union", {
			branches
		}) as never
	}

	prereduced<kind extends SchemaKind>(
		kind: kind,
		input: Definition<kind>
	): Node<kind> {
		return this.node(kind, input, {
			prereduced: true
		}) as never
	}

	schemaFromKinds<defKind extends SchemaKind>(
		allowedKinds: readonly defKind[],
		input: unknown
	): Node<reducibleKindOf<defKind>> {
		const kind = schemaKindOf(input)
		if (!allowedKinds.includes(kind as never)) {
			return throwParseError(
				`Schema of kind ${kind} should be one of ${allowedKinds}`
			)
		}
		return this.node(kind, input as never, {}) as never
	}

	static parseCache: Record<string, Node> = {}

	node<defKind extends NodeKind>(
		kind: defKind,
		input: Definition<defKind>,
		ctxInput?: SchemaParseContextInput
	): Node<reducibleKindOf<defKind>> {
		if (isNode(input)) {
			return input as never
		}
		const implementation: UnknownNodeImplementation = NodeImplementationByKind[
			kind
		] as never
		const inner: Record<string, unknown> = {}
		const normalizedInput: any = implementation.normalize?.(input) ?? input
		const ctx: SchemaParseContext<any> = {
			...ctxInput,
			input: normalizedInput,
			scope: this
		}
		implementation.addContext?.(ctx)
		const schemaEntries = entriesOf(normalizedInput).sort((l, r) =>
			l[0] < r[0] ? -1 : 1
		)
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: UnknownNode[] = []
		for (const [k, v] of schemaEntries) {
			const keyDefinition = implementation.keys[k]
			if (!(k in implementation.keys)) {
				return throwParseError(`Key ${k} is not valid on ${kind} schema`)
			}
			const innerValue = keyDefinition.parse ? keyDefinition.parse(v, ctx) : v
			if (innerValue === undefined && !keyDefinition.preserveUndefined) {
				continue
			}
			inner[k] = innerValue
			if (keyDefinition.child) {
				if (Array.isArray(innerValue)) {
					json[k] = innerValue.map((node) => node.collapsibleJson)
					children.push(...innerValue)
				} else {
					json[k] = innerValue.collapsibleJson
					children.push(innerValue)
				}
			} else {
				json[k] = keyDefinition.serialize
					? keyDefinition.serialize(v)
					: defaultInnerKeySerializer(v)
			}
			if (!keyDefinition.meta) {
				typeJson[k] = json[k]
			}
		}
		if (!ctx.prereduced) {
			if (implementation.reduce) {
				const reduced = implementation.reduce(inner, ctx)
				if (reduced) {
					return reduced as never
				}
			}
		}
		const innerEntries = entriesOf(inner)
		let collapsibleJson = json
		if (
			innerEntries.length === 1 &&
			innerEntries[0][0] === implementation.collapseKey
		) {
			collapsibleJson = json[implementation.collapseKey] as never
			if (hasDomain(collapsibleJson, "object")) {
				json = collapsibleJson
				typeJson = collapsibleJson
			}
		}
		const id = kind + JSON.stringify(json)
		if (id in Space.parseCache) {
			return Space.parseCache[id] as never
		}
		const typeId = kind + JSON.stringify(typeJson)
		if (Space.unknownUnion?.typeId === typeId) {
			return this.prereduced("intersection", {}) as never
		}
		const attachments = {
			kind,
			inner,
			entries: innerEntries,
			json,
			typeJson,
			collapsibleJson,
			children,
			id,
			typeId,
			space: this
		} satisfies Record<keyof BaseAttachments<any>, unknown>
		return includes(refinementKinds, kind)
			? new (BaseNode as any)(attachments)
			: new (SchemaNode as any)(attachments)
	}

	readonly schema = Object.assign(this.branches.bind(this), {
		units: this.units.bind(this),
		union: this.union.bind(this),
		prereduced: this.prereduced.bind(this)
	})
}

export const space = Space.from

export const rootSchema = Space.root.schema.bind(Space.root)

export const rootNode = Space.root.node.bind(Space.root)

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
