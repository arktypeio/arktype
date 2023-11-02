import {
	CompiledFunction,
	type conform,
	type Dict,
	DynamicBase,
	type evaluate,
	type exactMessageOnError,
	type extend,
	includes,
	isArray,
	type Json,
	type JsonData,
	type optionalizeKeys,
	type satisfy,
	throwInternalError
} from "@arktype/util"
import { type BasisKind } from "./bases/basis.js"
import { type ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import {
	type Node,
	type NodeClass,
	type NodeDeclarationsByKind,
	type NodeKind,
	type reducibleParseResult,
	type reifyIntersections,
	type RuleKind
} from "./nodes.js"
import { type SetKind } from "./sets/set.js"
import { createParseContext, inferred, type ParseContext } from "./utils.js"

export type BaseAttributes = {
	readonly alias?: string
	readonly description?: string
}

export type withAttributes<o extends object> = extend<BaseAttributes, o>

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

type allowedIntersectionKeyOf<kind extends NodeKind> =
	| rightOf<kind>
	// SetKinds must intersect with rule, and unit being the
	// highest precedence rule is the only other node that can unambiguously.
	| (kind extends SetKind | "unit" ? "rule" : never)

export type BaseIntersectionMap = {
	[lKey in NodeKind]: evaluate<
		{ [rKey in lKey]: {} } & {
			[rKey in NodeKind | "rule"]?: rKey extends allowedIntersectionKeyOf<lKey>
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

export type UnknownNode = BaseNode<BaseNodeDeclaration>

export type DeclarationInput<kind extends NodeKind> = {
	kind: kind
	schema: unknown
	// each node's inner definition must have a required key with the same name
	// as its kind that can be used as a discriminator
	inner: BaseAttributes & { [k in kind]: unknown }
	intersections: BaseIntersectionMap[kind]
	reductions?: rightOf<kind>
}

export type BaseDeclarationInput = {
	kind: NodeKind
	schema: unknown
	inner: BaseAttributes
	intersections: {
		[k in NodeKind | "rule"]?: NodeKind | Disjoint | null
	}
	reductions?: NodeKind
}

export type declareNode<
	types extends exactMessageOnError<
		types,
		types extends {
			kind: infer kind extends NodeKind
		}
			? DeclarationInput<kind>
			: never
	>
> = types &
	("reductions" extends keyof types
		? unknown
		: { reductions: types["kind" & keyof types] })

export type BaseNodeDeclaration = BaseDeclarationInput & { reductions: {} }

export type StaticNodeDefinition<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> = {
	kind: d["kind"]
	keys: Record<Exclude<keyof d["inner"], keyof BaseAttributes>, keyof NodeIds>
	intersections: reifyIntersections<d["kind"], d["intersections"]>
	parseSchema: (schema: d["schema"], ctx: ParseContext) => d["inner"]
	writeDefaultDescription: (inner: d["inner"]) => string
	compileCondition: (inner: d["inner"]) => string
	reduceToNode?: (inner: d["inner"]) => Node<d["reductions"]>
	children?: (inner: d["inner"]) => readonly UnknownNode[]
} & (d["reductions"] extends d["kind"] ? unknown : { reduceToNode: {} })

export interface StaticCompositeDefinition<
	d extends BaseNodeDeclaration = BaseNodeDeclaration
> {}

type instantiateNodeClassDeclaration<declaration> = {
	[k in keyof declaration]: k extends "keys"
		? evaluate<declaration[k] & typeof baseAttributeKeys>
		: declaration[k]
}

type declarationOf<nodeClass> = nodeClass extends {
	declaration: infer declaration extends Required<BaseNodeDeclaration>
}
	? declaration
	: never

const $ark = registry()

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

	/** Each node class is attached when it is imported.
	 * This helps avoid circular import issues that can otherwise occur.
	 */
	static classesByKind = {} as { [k in NodeKind]: NodeClass<k> }

	protected static define<nodeClass, definition>(
		this: nodeClass,
		definition: conform<
			definition,
			/** @ts-expect-error (trying to constrain further breaks types or causes circularities) */
			StaticNodeDefinition<nodeClass["declaration"]>
		>
	) {
		// register the newly defined node class
		;(this as any).classesByKind[definition.kind] = this
		return {
			...definition,
			keys: {
				alias: "meta",
				description: "meta",
				...definition.keys
			}
		} as definition
	}

	static parse<nodeClass>(
		this: nodeClass,
		schema: declarationOf<nodeClass>["schema"],
		ctx = createParseContext()
	): reducibleParseResult<declarationOf<nodeClass>["kind"]> {
		const definition = (this as any).definition as StaticNodeDefinition
		const inner = definition.parseSchema(schema, ctx)
		return definition.reduceToNode?.(inner) ?? new (this as any)(inner)
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
	): intersectionOf<declaration["kind"], other["kind"]>
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

export type intersectionOf<l extends NodeKind, r extends NodeKind> =
	| asymmetricIntersectionOf<l, r>
	| asymmetricIntersectionOf<r, l>

type asymmetricIntersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = l extends unknown
	? r extends unknown
		? r extends keyof IntersectionMaps[l]
			? instantiateIntersection<IntersectionMaps[l][r]>
			: "rule" extends keyof IntersectionMaps[l]
			? r extends RuleKind
				? instantiateIntersection<IntersectionMaps[l]["rule"]>
				: never
			: never
		: r
	: never

type instantiateIntersection<result> = result extends NodeKind
	? reducibleParseResult<result>
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
