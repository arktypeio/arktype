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
	type SchemaParseOptions,
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
	allowsSource!: string
	readonly allowsOf: <alias extends keyof keywords>(
		alias: alias
	) => keywords[alias]["allows"]
	traverseSource!: string
	readonly traverseOf: <alias extends keyof keywords>(
		alias: alias
	) => keywords[alias]["traverse"]

	private constructor(aliases: Dict<string, Definition<SchemaKind>>) {
		// 1. Parse schema, create basic inner
		// 2. Use 1 to compile allows
		// 3. Reduce
		// 4. Compile traverse, discriminate etc.
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
		for (const schema of this.schemas) {
			schema.allows = this.allowsOf(schema.alias as never)
			schema.traverse = this.traverseOf(schema.alias as never)
		}
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

	// TODO: cache
	compile<kind extends CompilationKind>(kind: kind): this[`${kind}Of`]
	compile(kind: CompilationKind): any {
		let $ource = `const $ = {
			${this.references
				.map(
					(reference) => `${reference.alias}(${In}){
					${reference.compileBody({
						compilationKind: kind,
						path: [],
						discriminants: []
					})}
			}`
				)
				.join(",\n")}`
		if (kind === "allows") {
			$ource += `}
			return $`
			this.allowsSource = $ource
			const $ = new CompiledFunction<() => any>($ource)
			return (alias: keyof keywords & string) => $()[alias]
		}
		for (const schema of this.schemas) {
			$ource += `,
	${schema.alias}Root(${In}) {
		const problems = []
		$.${schema.alias}(${In}, problems)
		if(problems.length === 0) {
			return { data: ${In} }
		}
		return { problems }
	}`
		}
		$ource += `}
		return $`
		this.traverseSource = $ource
		const $ = new CompiledFunction<() => any>($ource)
		return (alias: keyof keywords & string) => $()[`${alias}Root`]
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
		return this.node("union", input) as never
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
		def: Definition<defKind>,
		opts: SchemaParseOptions = {}
	): Node<reducibleKindOf<defKind>> {
		if (isNode(def)) {
			return def as never
		}
		return this.reduceAndInstantiate(
			this.parseAttachments(kind, def, opts),
			opts
		) as never
	}

	private parseAttachments<defKind extends NodeKind>(
		kind: defKind,
		def: Definition<defKind>,
		opts: SchemaParseOptions
	): BaseAttachments<any> {
		const implementation: UnknownNodeImplementation = NodeImplementationByKind[
			kind
		] as never
		const normalizedDefinition: any = implementation.normalize?.(def) ?? def
		const ctx: SchemaParseContext<defKind> = {
			...opts,
			normalizedDefinition,
			space: this,
			implementation
		}
		const inner: Record<string, unknown> = {}
		ctx.implementation.addContext?.(ctx)
		const schemaEntries = entriesOf(normalizedDefinition).sort((l, r) =>
			l[0] < r[0] ? -1 : 1
		)
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: UnknownNode[] = []
		for (const [k, v] of schemaEntries) {
			const keyDefinition = ctx.implementation.keys[k]
			if (!(k in ctx.implementation.keys)) {
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
		const innerEntries = entriesOf(inner)
		let collapsibleJson = json
		if (
			innerEntries.length === 1 &&
			innerEntries[0][0] === ctx.implementation.collapseKey
		) {
			collapsibleJson = json[ctx.implementation.collapseKey] as never
			if (hasDomain(collapsibleJson, "object")) {
				json = collapsibleJson
				typeJson = collapsibleJson
			}
		}
		const id = JSON.stringify({ kind, ...json })
		if (id in Space.parseCache) {
			return Space.parseCache[id] as never
		}
		const typeId = JSON.stringify({ kind, ...typeJson })
		return {
			kind,
			implementation: ctx.implementation,
			inner,
			entries: innerEntries,
			json,
			typeJson,
			collapsibleJson,
			children,
			id,
			typeId,
			space: this
		} satisfies Record<keyof BaseAttachments<any>, unknown> as never
	}

	private reduceAndInstantiate(
		attachments: BaseAttachments<any>,
		opts: SchemaParseOptions
	): UnknownNode | undefined {
		if (!opts.prereduced) {
			if (Space.unknownUnion?.typeId === attachments.typeId) {
				return Space.keywords.unknown
			}
			if (attachments.implementation.reduce) {
				const reduced = attachments.implementation.reduce(
					attachments.inner,
					this
				)
				if (reduced) {
					return reduced
				}
			}
		}
		return includes(refinementKinds, attachments.kind)
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
