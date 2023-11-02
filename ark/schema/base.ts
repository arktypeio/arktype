import type {
	conform,
	Constructor,
	Dict,
	evaluate,
	extend,
	Fn,
	instanceOf,
	Json,
	JsonData,
	requireKeys,
	returnOf,
	satisfy
} from "@arktype/util"
import {
	CompiledFunction,
	DynamicBase,
	includes,
	isArray,
	throwInternalError
} from "@arktype/util"
import { type BasisKind } from "./bases/basis.js"
import { type ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import {
	type IntersectionMap,
	type Node,
	type NodeClass,
	type NodeKind,
	type reifyIntersections,
	type RuleKind,
	type Schema
} from "./nodes.js"
import { type SetKind } from "./sets/set.js"
import { createParseContext, inferred, type ParseContext } from "./utils.js"

export type BaseAttributes = {
	readonly alias?: string
	readonly description?: string
}

export type withAttributes<o extends object> = extend<BaseAttributes, o>

export type DeclaredTypes<kind extends NodeKind = NodeKind> = {
	kind: kind
	schema: unknown
	// each node's inner definition must have a required key with the same name
	// as its kind that can be used as a discriminator.
	inner: BaseAttributes & { [k in kind]: unknown }
	intersections: BaseIntersectionMap[kind]
	reductions?: rightOf<kind>
}

export type declareNode<
	types extends {
		[k in keyof DeclaredTypes]: types extends {
			kind: infer kind extends NodeKind
		}
			? conform<types[k], DeclaredTypes<kind>[k]>
			: never
	} & { [k in Exclude<keyof types, keyof DeclaredTypes>]: never }
> = types

export type BaseNodeDeclaration = declareNode<DeclaredTypes<any>>

export const baseAttributeKeys = {
	alias: "meta",
	description: "meta"
} as const satisfies Record<keyof BaseAttributes, keyof NodeIds>

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

type allowedAsymmetricOperandOf<kind extends NodeKind> =
	| rightOf<kind>
	// SetKinds must intersect with rule, and unit being the
	// highest precedence rule is the only other node that can unambiguously.
	| (kind extends SetKind | "unit" ? "rule" : never)

export type rightOf<kind extends NodeKind> = OrderedNodeKinds extends readonly [
	...unknown[],
	kind,
	...infer right extends NodeKind[]
]
	? right[number]
	: never

export type BaseIntersectionMap = {
	[lKey in NodeKind]: evaluate<
		{ [rKey in lKey]: lKey | Disjoint | null } & {
			[rKey in
				| NodeKind
				| "rule"]?: rKey extends allowedAsymmetricOperandOf<lKey>
				? lKey | Disjoint | null
				: never
		}
	>
}

export const irreducibleConstraintKinds = {
	pattern: 1,
	predicate: 1,
	required: 1,
	optional: 1
} as const

export type IrreducibleConstraintKind = keyof typeof irreducibleConstraintKinds

export type UnknownNode = BaseNode<any>

const $ark = registry()

export type StaticNodeDefinition<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> = {
	kind: d["kind"]
	keys: Record<Exclude<keyof d["inner"], keyof BaseAttributes>, keyof NodeIds>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	parseSchema: (schema: d["schema"], ctx: ParseContext) => d["inner"]
	writeDefaultDescription: (inner: d["inner"]) => string
	compileCondition: (inner: d["inner"]) => string
	children?: (inner: d["inner"]) => readonly UnknownNode[]
} & (d["reductions"] extends NodeKind
	? { reduceToNode: (inner: d["inner"]) => Node<d["kind"] | d["reductions"]> }
	: { reduceToNode?: (inner: d["inner"]) => Node<d["kind"]> })

type instantiateNodeClassDeclaration<declaration> = {
	[k in keyof declaration]: k extends "keys"
		? evaluate<declaration[k] & typeof baseAttributeKeys>
		: declaration[k]
}

type declarationOf<nodeClass> = nodeClass extends {
	declaration: infer declaration extends BaseNodeDeclaration
}
	? declaration
	: never

export abstract class BaseNode<
	declaration extends BaseNodeDeclaration,
	t = unknown
> extends DynamicBase<declaration["inner"]> {
	declare infer: t;
	declare [inferred]: t

	readonly nodeClass = this.constructor as NodeClass<declaration["kind"]>
	readonly definition = this.nodeClass
		.definition as instantiateNodeClassDeclaration<any>
	readonly json: Json
	// TODO: type
	readonly children: readonly UnknownNode[]
	readonly references: readonly UnknownNode[]
	protected readonly contributesReferences: readonly UnknownNode[]
	readonly alias: string
	readonly description: string
	readonly ids: NodeIds = new NodeIds(this)
	readonly condition: string
	readonly kind: declaration["kind"] = this.definition.kind
	readonly allows: (data: unknown) => boolean

	constructor(public readonly inner: declaration["inner"]) {
		super(inner)
		this.alias = $ark.register(this, inner.alias)
		this.description =
			inner.description ?? this.definition.writeDefaultDescription(inner)
		this.json = this.nodeClass.serialize(inner)
		this.condition = this.definition.compileCondition(inner)
		this.children = this.definition.children?.(inner) ?? ([] as any)
		this.references = this.children.flatMap(
			(child) => child.contributesReferences
		)
		this.contributesReferences = [this, ...this.references]
		this.allows = new CompiledFunction(
			BaseNode.argName,
			`return ${this.condition}`
		)
	}

	static parse<nodeClass>(
		this: nodeClass,
		schema: declarationOf<nodeClass>["schema"],
		ctx = createParseContext()
	): Node<
		| declarationOf<nodeClass>["kind"]
		| (returnOf<declarationOf<nodeClass>["reductions"]> & NodeKind)
	> {
		const definition = (this as any).definition as StaticNodeDefinition
		const inner = definition.parseSchema(schema, ctx)
		return definition.reduceToNode?.(inner) ?? new (this as any)(inner)
	}

	static classesByKind = {} as { [k in NodeKind]: NodeClass<k> }

	static serialize(inner: object) {
		const json: Json = {}
		for (const k in inner) {
			json[k] = this.serializeValue((inner as Dict)[k])
		}
		return json
	}

	static serializeValue(v: unknown): JsonData {
		if (
			typeof v === "string" ||
			typeof v === "boolean" ||
			typeof v === "number" ||
			v === null
		) {
			return v
		}
		if (typeof v === "object") {
			if (v instanceof BaseNode) {
				return v.json
			}
			if (
				isArray(v) &&
				v.every(
					(element): element is UnknownNode => element instanceof BaseNode
				)
			) {
				return v.map((element) => {
					return element.json
				})
			}
		}
		return compileSerializedValue(v)
	}

	protected static define<nodeClass, definition>(
		this: nodeClass,
		definition: conform<
			definition,
			/** @ts-expect-error (trying to constrain further breaks types or causes circularities) */
			StaticNodeDefinition<nodeClass["declaration"]>
		>
	) {
		return {
			...definition,
			keys: {
				alias: "meta",
				description: "meta",
				...definition.keys
			}
		} as definition
	}

	protected static readonly argName = In

	serialize(kind: keyof NodeIds = "meta") {
		return JSON.stringify(this.json)
	}

	toJSON() {
		return this.json
	}

	equals(other: UnknownNode) {
		return this.ids.morph === other.ids.morph
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}

	isBasis(): this is Node<BasisKind> {
		return (
			this.kind === "domain" || this.kind === "proto" || this.kind === "unit"
		)
	}

	toString() {
		return this.description
	}

	// TODO: add input kind, caching
	intersect<other extends Node>(
		other: other
	): intersectionOf<this["kind"], other["kind"]>
	intersect(other: BaseNode<BaseNodeDeclaration>) {
		if (other.ids.morph === this.ids.morph) {
			// TODO: meta
			return this
		}
		const l = leftOperandOf(this, other)
		const r = l === this ? other : this
		const intersector =
			l.definition.intersections[r.kind] ??
			(includes(ruleKinds, r.kind)
				? l.definition.intersections["rule"]
				: undefined)
		const result = intersector?.(l, r)
		if (result) {
			if (result instanceof Disjoint) {
				return l === this ? result : result.invert()
			}
			// TODO: meta, use kind entry?
			return new (l.nodeClass as any)(result)
		}
		return null
	}
}

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

export type intersectionOf<l extends NodeKind, r extends NodeKind> = [
	l,
	r
] extends [r, l]
	? instantiateIntersection<IntersectionMap<l>[l & keyof IntersectionMap<l>]>
	: collectResults<l, r>

type collectResults<
	l extends NodeKind,
	r extends NodeKind
> = r extends rightOf<l>
	? collectSingleResult<l, r>
	: l extends rightOf<r>
	? collectSingleResult<r, l>
	: never

type collectSingleResult<
	l extends NodeKind,
	r extends NodeKind
> = r extends keyof IntersectionMap<l>
	? instantiateIntersection<IntersectionMap<l>[r]>
	: r extends RuleKind
	? "rule" extends keyof IntersectionMap<l>
		? instantiateIntersection<IntersectionMap<l>["rule"]>
		: never
	: never

// TODO: add reductions
type instantiateIntersection<result> = result extends NodeKind
	? Node<
			| result
			| (NodeClass<result>["declaration"] extends {
					reductions: infer reductionKind extends NodeKind
			  }
					? reductionKind
					: never)
	  >
	: result

export class NodeIds {
	private cache: { -readonly [k in keyof NodeIds]?: string } = {}

	constructor(private node: UnknownNode) {}

	get in() {
		this.cache.in ??= this.node.serialize("in")
		return this.cache.in
	}

	get out() {
		this.cache.out ??= this.node.serialize("out")
		return this.cache.out
	}

	get morph() {
		this.cache.morph ??= this.node.serialize("morph")
		return this.cache.morph
	}

	get meta() {
		this.cache.meta ??= this.node.serialize("meta")
		return this.cache.meta
	}
}
