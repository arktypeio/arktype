import type {
	Dict,
	entryOf,
	extend,
	instanceOf,
	Json,
	JsonData,
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
import {
	type ConstraintContext,
	type ConstraintKind
} from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import {
	type Inner,
	type IntersectionMap,
	type LeftIntersections,
	type Node,
	type NodeClass,
	type NodeKind,
	type RuleKind
} from "./nodes.js"
import { type Root } from "./root.js"
import { type SetKind } from "./sets/set.js"
import { inferred } from "./utils.js"

export type BaseAttributes = {
	readonly alias?: string
	readonly description?: string
}

export type withAttributes<o extends object> = extend<BaseAttributes, o>

export type NodeTypes<kind extends NodeKind> = {
	schema: unknown
	inner: BaseAttributes
	intersections: BaseIntersectionMap[kind]
}

export type declareNode<
	kind extends NodeKind,
	types extends NodeTypes<kind>,
	implementation extends StaticBaseNode<
		declareNode<kind, types, implementation>
	>
> = extend<
	types,
	{
		kind: kind
		class: implementation
	}
>

export type NodeDeclaration<
	implementation extends StaticBaseNode<any> = StaticBaseNode<any>
> = declareNode<NodeKind, NodeTypes<any>, implementation>

export const baseAttributeKeys = {
	alias: 1,
	description: 1
} as const satisfies Record<keyof BaseAttributes, 1>

export type StaticBaseNode<d extends NodeDeclaration> = {
	new (inner: d["inner"]): instanceOf<d["class"]>
	kind: d["kind"]
	keyKinds: Record<keyof d["inner"], keyof NodeIds>
	serialize(inner: d["inner"]): Json
	parse(
		input: d["schema"],
		ctx: ConstraintContext
	): d["kind"] extends "union"
		? Root
		: d["kind"] extends "intersection"
		? Node<"intersection" | BasisKind>
		: instanceOf<d["class"]>
	childrenOf?(inner: d["inner"]): readonly UnknownNode[]
	intersections: LeftIntersections<d["kind"]>
	compile(inner: d["inner"]): string
	writeDefaultDescription(inner: d["inner"]): string
}

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
	[lKey in NodeKind]: { [_ in lKey]: NodeKind | Disjoint | null } & {
		[rKey in NodeKind]?: rKey extends allowedAsymmetricOperandOf<lKey>
			? NodeKind | Disjoint | null
			: never
	}
}

export const irreducibleConstraintKinds = {
	pattern: 1,
	predicate: 1,
	required: 1,
	optional: 1
} as const

export type IrreducibleConstraintKind = keyof typeof irreducibleConstraintKinds

type kindOf<nodeClass> = instanceOf<nodeClass> extends {
	kind: infer kind extends NodeKind
}
	? kind
	: never

type extensionKeyOf<nodeClass> = Exclude<
	keyof Inner<kindOf<nodeClass>>,
	keyof BaseAttributes
>

export type UnknownNode = BaseNode<any>

const $ark = registry()

export abstract class BaseNode<
	declaration extends NodeDeclaration,
	t = unknown
> extends DynamicBase<declaration["inner"]> {
	declare infer: t;
	declare [inferred]: t

	readonly json: Json
	// TODO: type
	readonly children: readonly UnknownNode[]
	readonly references: readonly UnknownNode[]
	protected readonly contributesReferences: readonly UnknownNode[]
	readonly alias: string
	readonly description: string
	readonly ids: NodeIds = new NodeIds(this)
	readonly nodeClass = this.constructor as declaration["class"]
	readonly kind: declaration["kind"] = this.nodeClass.kind
	readonly condition: string
	readonly allows: (data: unknown) => boolean

	constructor(public readonly inner: declaration["inner"]) {
		super(inner)
		this.alias = $ark.register(this, inner.alias)
		this.description =
			inner.description ?? this.nodeClass.writeDefaultDescription(inner)
		this.json = this.nodeClass.serialize(inner)
		this.condition = this.nodeClass.compile(inner)
		this.children = this.nodeClass.childrenOf?.(inner) ?? ([] as any)
		this.references = (this.children as UnknownNode[]).flatMap(
			(child) => child.contributesReferences
		)
		this.contributesReferences = [this, ...this.references]
		this.allows = new CompiledFunction(
			BaseNode.argName,
			`return ${this.condition}`
		)
	}

	static classesByKind = {} as { [k in NodeKind]: NodeClass<k> }

	static serialize = this.defineSerializer((inner: object) => {
		const json: Json = {}
		for (const k in inner) {
			json[k] = this.serializeValue((inner as Dict)[k])
		}
		return json
	})

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

	protected static declareKeys<nodeClass>(
		this: nodeClass,
		keyKinds: {
			[k in extensionKeyOf<nodeClass>]: keyof NodeIds
		}
	) {
		return {
			alias: "meta",
			description: "meta",
			...keyKinds
		} satisfies Dict<string, keyof NodeIds> as {} as {
			[k in keyof Inner<kindOf<nodeClass>>]-?: keyof NodeIds
		}
	}

	protected static defineIntersections<nodeClass>(
		this: nodeClass,
		intersections: LeftIntersections<kindOf<nodeClass>>
	) {
		return intersections
	}

	protected static readonly argName = In

	protected static defineCompiler<nodeClass>(
		this: nodeClass,
		compiler: (inner: Inner<kindOf<nodeClass>>) => string
	) {
		return compiler
	}

	protected static defineSerializer<nodeClass>(
		this: nodeClass,
		serializer: (inner: Inner<kindOf<nodeClass>>) => Json
	) {
		return serializer
	}

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
	intersect<other extends UnknownNode>(
		other: other
	): intersectionOf<this["kind"], other["kind"]>
	intersect(other: BaseNode<NodeDeclaration>): UnknownNode | Disjoint | null {
		if (other.ids.morph === this.ids.morph) {
			// TODO: meta
			return this
		}
		const l = leftOperandOf(this, other)
		const r = l === this ? other : this
		const intersector =
			l.nodeClass.intersections[r.kind] ??
			(includes(ruleKinds, r.kind)
				? l.nodeClass.intersections["rule"]
				: undefined)
		const result = intersector?.(l, r)
		if (result) {
			if (result instanceof Disjoint) {
				return l === this ? result : result.invert()
			}
			// TODO: meta, use kind entry?
			return new l.nodeClass(result as never) as never
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

export type intersectionOf<
	l extends NodeKind,
	r extends NodeKind
> = collectResults<l, r, OrderedNodeKinds>

type collectResults<
	l extends NodeKind,
	r extends NodeKind,
	remaining extends readonly unknown[]
> = remaining extends readonly [infer head, ...infer tail]
	? l extends head
		? collectSingleResult<l, r>
		: r extends head
		? collectSingleResult<r, l>
		: collectResults<l, r, tail>
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

type instantiateIntersection<result> = result extends NodeKind
	? Node<result>
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
