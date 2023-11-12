import {
	CastableBase,
	CompiledFunction,
	type Dict,
	entriesOf,
	type evaluate,
	type extend,
	includes,
	isArray,
	type Json,
	type JsonData,
	type listable,
	ParseError,
	type satisfy,
	throwInternalError,
	throwParseError
} from "@arktype/util"
import { type BasisKind } from "./bases/basis.ts"
import { type ConstraintKind } from "./constraints/constraint.ts"
import { Disjoint } from "./disjoint.ts"
import { compileSerializedValue, In } from "./io/compile.ts"
import { registry } from "./io/registry.ts"
import { unflattenRules } from "./main.ts"
import {
	type Attachments,
	type ExpandedSchema,
	type Implementation,
	type Inner,
	type Node,
	type NodeDeclarationsByKind,
	type NodeKind,
	type reifyIntersections,
	type RootKind,
	type RuleKind,
	type Schema
} from "./nodes.ts"
import { type ValidatorNode } from "./sets/morph.ts"
import { type SetKind } from "./sets/set.ts"
import {
	type BranchSchema,
	type parseSchemaBranches,
	type validateSchemaBranch
} from "./sets/union.ts"
import { inferred, type ParseContext } from "./utils.ts"

export type BaseAttributes = {
	readonly alias?: string
	readonly description?: string
}

export type withAttributes<o extends object> = extend<BaseAttributes, o>

export const setKinds = [
	"union",
	"morph",
	"intersection"
] as const satisfies readonly SetKind[]

export const basisKinds = [
	"unit",
	"proto",
	"domain"
] as const satisfies readonly BasisKind[]

export const rootKinds = [...setKinds, ...basisKinds] as const

export const constraintKinds = [
	"divisor",
	"max",
	"min",
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export const ruleKinds = [
	...basisKinds,
	...constraintKinds
] as const satisfies readonly RuleKind[]

export const orderedNodeKinds = [
	...setKinds,
	...ruleKinds
] as const satisfies readonly NodeKind[]

type OrderedNodeKinds = typeof orderedNodeKinds

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertIncludesAllKinds = satisfy<OrderedNodeKinds[number], NodeKind>

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type assertNoExtraKinds = satisfy<NodeKind, OrderedNodeKinds[number]>

export type BaseIntersectionMap = {
	[lKey in NodeKind]: evaluate<
		{
			[requiredKey in lKey]:
				| lKey
				| Disjoint
				| (lKey extends ConstraintKind ? null : never)
		} & {
			[rKey in rightOf<lKey> | "default"]?:
				| lKey
				| Disjoint
				| (lKey extends RuleKind ? null : never)
		}
	>
}

export const irreducibleConstraintKinds = [
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly ConstraintKind[]

export type IrreducibleConstraintKind = keyof typeof irreducibleConstraintKinds

export type ReducibleConstraintKind = Exclude<
	ConstraintKind,
	IrreducibleConstraintKind
>

export const reducibleConstraintKinds = constraintKinds.filter(
	(k): k is ReducibleConstraintKind => !includes(irreducibleConstraintKinds, k)
)

export type UnknownNode = BaseNode<any>

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	collapsedSchema?: unknown
	expandedSchema: BaseAttributes
	inner: BaseAttributes
	intersections: BaseIntersectionMap[kind]
	attach: Dict
}

export type BaseNodeDeclaration = {
	kind: NodeKind
	collapsedSchema?: unknown
	expandedSchema: BaseAttributes
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "default"]?: NodeKind | Disjoint | null
	}
	attach: Dict
}

export type declareNode<
	types extends {
		[k in keyof BaseNodeDeclaration]: types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>[k]
			: never
	} & { [k in Exclude<keyof types, keyof BaseNodeDeclaration>]?: never }
> = types

export const nodeImplementations = {} as { [k in NodeKind]: Implementation<k> }

export const defineNode = <
	kind extends NodeKind,
	implementation extends NodeImplementation<NodeDeclarationsByKind[kind]>
>(
	implementation: { kind: kind } & implementation
): instantiateNodeImplementation<implementation> => {
	Object.assign(implementation.keys, {
		alias: {
			meta: true
		},
		description: {
			meta: true
		}
	})
	nodeImplementations[implementation.kind] = implementation as never
	return implementation
}

type instantiateNodeImplementation<definition> = evaluate<
	definition & {
		keys: {
			[k in keyof BaseAttributes]: NodeKeyDefinition<BaseNodeDeclaration, k>
		}
	}
>

export type InnerKeyDefinitions<d extends BaseNodeDeclaration> = {
	[k in Exclude<keyof d["inner"], keyof BaseAttributes>]: NodeKeyDefinition<
		d,
		k
	>
}

export type RuleAttachments = {
	readonly condition: string
}

export type NodeKeyDefinition<
	d extends BaseNodeDeclaration,
	k extends keyof d["inner"]
> = {
	meta?: true
	children?: readonly NodeKind[]
	parse?: (
		schema: k extends keyof ExpandedSchema<d["kind"]>
			? ExpandedSchema<d["kind"]>[k]
			: undefined,
		ctx: ParseContext
	) => d["inner"][k]
	// require parse or children if we can't guarantee the schema value will be valid on inner
} & (ExpandedSchema<d["kind"]>[k] extends d["inner"][k]
	? {}
	: { parse: {} } | { children: {} })

export type NodeImplementation<d extends BaseNodeDeclaration> = {
	kind: d["kind"]
	keys: InnerKeyDefinitions<d>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	writeDefaultDescription: (inner: Node<d["kind"]>) => string
	attach: (inner: d["inner"]) => {
		[k in unsatisfiedAttachKey<d>]: d["attach"][k]
	}
	reduce?: (
		inner: d["inner"]
	) => Node<Extract<RootKind, rightOf<d["kind"]>>> | d["inner"]
	expand?: (
		schema: d["collapsedSchema"] | d["expandedSchema"]
	) => d["expandedSchema"]
	// require expand if collapsedSchema is defined
} & ("collapsedSchema" extends keyof d ? { expand: {} } : {})

type UnknownNodeImplementation = instantiateNodeImplementation<
	NodeImplementation<BaseNodeDeclaration>
>

type unsatisfiedAttachKey<d extends BaseNodeDeclaration> = {
	[k in keyof d["attach"]]: k extends keyof d["inner"]
		? d["inner"][k] extends d["attach"][k]
			? never
			: k
		: k
}[keyof d["attach"]]

const $ark = registry()

const defaultValueSerializer = (v: unknown): JsonData => {
	if (
		typeof v === "string" ||
		typeof v === "boolean" ||
		typeof v === "number" ||
		v === null
	) {
		return v
	}
	return compileSerializedValue(v)
}

// const parseListedRules = (
// 	schemas: RuleSchemaSet
// ): CollapsedIntersectionInner => {
// 	const basis = schemas[0] ? maybeParseBasis(schemas[0]) : undefined
// 	const rules: mutable<CollapsedIntersectionInner> = basis ? [basis] : []
// 	const constraintContext: ParseContext = { basis }
// 	for (let i = basis ? 1 : 0; i < schemas.length; i++) {
// 		rules.push(parseConstraint(schemas[i] as never, constraintContext))
// 	}
// 	return rules
// }

// const parseMappedRules = ({
// 	basis: basisSchema,
// 	...constraintSchemasByKind
// }: MappedIntersectionSchema<any>): CollapsedIntersectionInner => {
// 	const basis = basisSchema ? parseBasis(basisSchema) : undefined
// 	const rules: mutable<CollapsedIntersectionInner> = basis ? [basis] : []
// 	const constraintContext: ParseContext = { basis }
// 	for (const k in constraintSchemasByKind) {
// 		if (!includes(constraintKinds, k)) {
// 			return throwParseError(`'${k}' is not a valid constraint kind`)
// 		}
// 		const schemas = constraintSchemasByKind[k]
// 		if (isArray(schemas)) {
// 			rules.push(
// 				...schemas.map(
// 					(schema) => new BaseNode(schema as never, constraintContext)
// 				)
// 			)
// 		} else {
// 			rules.push(new BaseNode(schemas as never, constraintContext))
// 		}
// 	}
// 	return rules
// }

export class BaseNode<
	kind extends NodeKind = NodeKind,
	t = unknown
> extends CastableBase<Inner<kind> & Attachments<kind>> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	// static from<const branches extends readonly unknown[]>(
	// 	schema: {
	// 		branches: {
	// 			[i in keyof branches]: validateBranchInput<branches[i]>
	// 		}
	// 	} & ExpandedUnionSchema
	// ) {
	// 	return new UnionNode<inferNodeBranches<branches>>({
	// 		...schema,
	// 		branches: schema.branches.map((branch) => branch as never)
	// 	})
	// }

	static parseRoot<branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i]>
		}
	): parseSchemaBranches<branches>
	static parseRoot(...branches: BranchSchema[]) {
		return branches.map((schema) => this.parseBranch(schema))
	}

	private static parseBranch(schema: BranchSchema) {
		switch (typeof schema) {
			case "string":
				return new BaseNode("domain", { domain: schema })
			case "function":
				return new BaseNode("proto", { proto: schema })
			case "object":
				const basisKind = basisKinds.find((kind) => kind in schema)
				if (basisKind) {
					return new BaseNode(basisKind, schema as never)
				}
				if ("morph" in schema) {
					return new BaseNode("morph", schema as never)
				}
				return new BaseNode("intersection", schema as never)
			default:
				return throwParseError(`${typeof schema} is not a valid schema type`)
		}
	}

	static parseConstraint<kind extends ConstraintKind>(
		kind: kind,
		schema: Schema<kind>
	): Node<kind> {
		return new BaseNode(kind, schema as never) as never
	}

	static fromUnits<const branches extends readonly unknown[]>(
		...values: branches
	) {
		const uniqueValues: unknown[] = []
		for (const value of values) {
			if (!uniqueValues.includes(value)) {
				uniqueValues.push(value)
			}
		}
		return new BaseNode<"union", branches[number]>("union", {
			union: uniqueValues.map((unit) => new BaseNode("unit", { unit })),
			ordered: false
		})
	}

	protected readonly implementation: UnknownNodeImplementation
	readonly alias: string
	readonly description: string
	readonly json: Json
	readonly typeJson: Json
	readonly children: UnknownNode[]
	readonly id: string
	readonly typeId: string
	readonly includesMorph: boolean
	readonly references: readonly UnknownNode[]
	readonly contributesReferences: readonly UnknownNode[]
	readonly allows: (data: unknown) => data is t

	private constructor(
		public kind: kind,
		public inner: Inner<kind>
	) {
		super()
		this.alias = $ark.register(this, this.inner.alias)
		this.implementation = nodeImplementations[kind] as never
		this.json = {}
		this.typeJson = {}
		this.children = []
		for (const [k, v] of Object.entries<unknown>(this.inner)) {
			if (!(k in this.implementation.keys)) {
				throw new ParseError(`'${k}' is not a valid ${this.kind} key`)
			}
			const keyDefinition = (
				this.implementation.keys as InnerKeyDefinitions<any>
			)[k]
			if (keyDefinition.children) {
				const children = v as listable<UnknownNode>
				if (isArray(children)) {
					this.json[k] = children.map((child) => child.json)
					this.typeJson[k] = children.map((child) => child.json)
					this.children.push(...children)
				} else {
					this.json[k] = children.json
					this.typeJson[k] = children.json
					this.children.push(children)
				}
			} else {
				this.json[k] = defaultValueSerializer(v)
				if (!keyDefinition.meta) {
					this.typeJson[k] = this.json[k]
				}
			}
			if (k === "in") {
				this.inCache = v as UnknownNode
			} else if (k === "out") {
				this.outCache = v as UnknownNode
			} else {
				;(this as any)[k] = v
			}
		}
		this.id = JSON.stringify(this.json)
		this.typeId = JSON.stringify(this.typeJson)
		this.includesMorph =
			this.kind === "morph" ||
			this.children.some((child) => child.includesMorph)
		this.references = this.children.flatMap(
			(child) => child.contributesReferences
		)
		this.contributesReferences = [this, ...this.references]
		Object.assign(this, this.implementation.attach(this.inner))
		this.allows = new CompiledFunction(In, `return true`)
		// important this is last as writeDefaultDescription cdould rely on attached
		this.description =
			this.inner.description ??
			this.implementation.writeDefaultDescription(this as never)
	}

	inCache?: UnknownNode;
	get in(): this["kind"] extends "morph" ? ValidatorNode : UnknownNode {
		if (!this.inCache) {
			this.inCache = this.getIo("in")
		}
		return this.inCache as never
	}

	outCache?: UnknownNode
	get out(): this["kind"] extends "morph" ? ValidatorNode : UnknownNode {
		if (!this.outCache) {
			this.outCache = this.getIo("out")
		}
		return this.outCache as never
	}

	private getIo(kind: "in" | "out"): UnknownNode {
		if (!this.includesMorph) {
			return this
		}
		const ioInner: Record<string, unknown> = {}
		for (const [k, v] of entriesOf(this.inner)) {
			const keyDefinition = this.implementation.keys[k as keyof BaseAttributes]!
			if (keyDefinition.children) {
				ioInner[k] = Array.isArray(v)
					? v.map((child) => child[kind])
					: (v as UnknownNode)[kind]
			} else if (!keyDefinition.meta) {
				ioInner[k] = this.inner[k]
			}
		}
		// TODO; reduce?
		return BaseNode.parseRoot(ioInner as never)
	}

	toJSON() {
		return this.json
	}

	equals(other: UnknownNode) {
		return this.typeId === other.typeId
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === (kind as never)
	}

	isBasis(): this is Node<BasisKind> {
		return includes(basisKinds, this.kind)
	}

	isConstraint(): this is Node<ConstraintKind> {
		return includes(constraintKinds, this.kind)
	}

	isRule(): this is Node<RuleKind> {
		return includes(ruleKinds, this.kind)
	}

	isSet(): this is Node<SetKind> {
		return includes(setKinds, this.kind)
	}

	toString() {
		return this.description
	}

	// TODO: add input kind, caching
	intersect<other extends Node>(
		other: other
	): intersectionOf<kind, other["kind"]>
	intersect(other: UnknownNode): UnknownNode | Disjoint {
		const closedResult = this.intersectClosed(other as never)
		if (closedResult !== null) {
			return closedResult as UnknownNode | Disjoint
		}
		if (!this.isRule() || !other.isRule()) {
			return throwInternalError(
				`Unexpected null intersection between non-rules ${this.kind} and ${other.kind}`
			)
		}
		return new BaseNode("intersection", unflattenRules([this as never, other]))
	}

	intersectClosed<other extends Node>(
		other: other
	): BaseNode<kind> | Node<other["kind"]> | Disjoint | null {
		if (this.equals(other)) {
			// TODO: meta
			return this as never
		}
		const l = leftOperandOf(this, other)
		const thisIsLeft = l === this
		const r: UnknownNode = thisIsLeft ? other : this
		const intersections = l.implementation.intersections
		const intersector = (intersections as any)[r.kind] ?? intersections.default
		const result = intersector?.(l, r)
		if (result) {
			if (result instanceof Disjoint) {
				return thisIsLeft ? result : result.invert()
			}
			// TODO: reduce
			// TODO: meta
			return new BaseNode(l.kind, result)
		}
		return null
	}

	constrain<constraintKind extends ConstraintKind>(
		this: Node<RootKind>,
		kind: constraintKind,
		definition: Schema<constraintKind>
	): Exclude<intersectionOf<this["kind"], constraintKind>, Disjoint> {
		const result = this.intersect(
			new BaseNode(kind, definition as never) as {} as Node
		)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	// TODO: inferIntersection
	and<other extends Node>(
		other: other
	): Exclude<intersectionOf<kind, other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<other extends Node>(
		other: other
	): Node<
		"union" | Extract<kind | other["kind"], RootKind>,
		t | other["infer"]
	> {
		return this as never
	}

	isUnknown(): this is BaseNode<"intersection", unknown> {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is BaseNode<"union", never> {
		return this.hasKind("union") && this.children.length === 0
	}

	getPath() {
		return this
	}

	array(): BaseNode<"intersection", t[]> {
		return this as never
	}

	extends<other extends Node>(
		other: other
	): this is Node<kind, other["infer"]> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export const node = Object.assign(BaseNode.parseRoot, {
	units: BaseNode.fromUnits
})

const leftOperandOf = (l: UnknownNode, r: UnknownNode) => {
	for (const kind of orderedNodeKinds) {
		if (l.kind === kind) {
			return l
		} else if (r.kind === kind) {
			return r
		}
	}
	return throwInternalError(
		`Unable to order unknown node kinds '${l.kind}' and '${r.kind}'.`
	)
}

export type rightOf<kind extends NodeKind> = RightsByKind[kind]

export type RightsByKind = accumulateRightKinds<OrderedNodeKinds, {}>

type accumulateRightKinds<
	remaining extends readonly NodeKind[],
	result
> = remaining extends readonly [
	infer head extends NodeKind,
	...infer tail extends NodeKind[]
]
	? accumulateRightKinds<tail, result & { [k in head]: tail[number] }>
	: result

export type IntersectionMaps = {
	[k in NodeKind]: NodeDeclarationsByKind[k]["intersections"]
}

export type intersectionOf<l extends NodeKind, r extends NodeKind> = [
	l,
	r
] extends [r, l]
	? instantiateIntersection<l>
	: asymmetricIntersectionOf<l, r> | asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = l extends unknown
	? r extends unknown
		? r extends keyof IntersectionMaps[l]
			? instantiateIntersection<IntersectionMaps[l][r]>
			: "default" extends keyof IntersectionMaps[l]
			? r extends rightOf<l>
				? instantiateIntersection<IntersectionMaps[l]["default"]>
				: never
			: never
		: r
	: never

type instantiateIntersection<result> = result extends NodeKind
	? Node<result>
	: result
