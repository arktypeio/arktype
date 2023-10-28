import type {
	AbstractableConstructor,
	conform,
	Dict,
	extend,
	instanceOf,
	Json,
	JsonData
} from "@arktype/util"
import { CompiledFunction, DynamicBase, isArray, isKeyOf } from "@arktype/util"
import { type BasisKind } from "./constraints/basis.js"
import { type ConstraintKind } from "./constraints/constraint.js"
import { type RefinementContext } from "./constraints/refinement.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import {
	type IntersectionMap,
	type LeftIntersections,
	type Node,
	type NodeKind,
	type TypeKind
} from "./node.js"
import { type UnionInner } from "./union.js"
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
	from(input: d["schema"], ctx: RefinementContext): instanceOf<d["class"]>
	childrenOf?(inner: d["inner"]): readonly UnknownNode[]
	intersections: LeftIntersections<d["kind"]>
	compile(inner: d["inner"]): string
	writeDefaultDescription(inner: d["inner"]): string
}

const orderedNodeKinds = [
	"union",
	"morph",
	"intersection",
	"unit",
	"proto",
	"domain",
	"divisor",
	"max",
	"min",
	"pattern",
	"predicate",
	"required",
	"optional"
] as const satisfies readonly NodeKind[]

type OrderedNodeKinds = typeof orderedNodeKinds

type allowedAsymmetricOperandOf<
	kind extends NodeKind,
	remaining extends readonly NodeKind[] = OrderedNodeKinds
> = remaining extends readonly [
	infer head,
	...infer tail extends readonly NodeKind[]
]
	? head extends kind
		?
				| remaining[number]
				// TypeKinds must intersect with constraint, and unit being the
				// highest precedence constraint is the only other node that can unambiguously.
				| (kind extends TypeKind | "unit" ? "constraint" : never)
		: allowedAsymmetricOperandOf<kind, tail>
	: kind

export type BaseIntersectionMap = {
	[lKey in NodeKind]: { [_ in lKey]: NodeKind | Disjoint | null } & {
		[rKey in NodeKind]?: rKey extends allowedAsymmetricOperandOf<lKey>
			? NodeKind | Disjoint | null
			: never
	}
}

export const irreducibleRefinementKinds = {
	pattern: 1,
	predicate: 1,
	required: 1
} as const

export type IrreducibleRefinementKind = keyof typeof irreducibleRefinementKinds

type innerOf<nodeClass> = ConstructorParameters<
	conform<nodeClass, AbstractableConstructor>
>[0]

type kindOf<nodeClass> = instanceOf<nodeClass> extends {
	kind: infer kind extends NodeKind
}
	? kind
	: never

type extensionKeyOf<nodeClass> = Exclude<
	keyof innerOf<nodeClass>,
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
	readonly collapsedJson: JsonData
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
		this.json = innerToJson(inner)
		this.collapsedJson =
			Object.keys(this.json).length === 1 && isKeyOf(this.kind, this.json)
				? this.json[this.kind]
				: this.json
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
			[k in keyof innerOf<nodeClass>]-?: keyof NodeIds
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
		compiler: (inner: innerOf<nodeClass>) => string
	) {
		return compiler
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
		const lrResult = this.nodeClass.intersections[other.kind]?.(
			this as never,
			other as never
		)
		if (lrResult) {
			if (lrResult instanceof Disjoint) {
				return lrResult
			}
			// TODO: meta, use kind entry?
			return new this.nodeClass(lrResult as never) as never
		}
		const rlResult = other.nodeClass.intersections[this.kind]?.(
			other as never,
			this as never
		)
		if (rlResult) {
			if (rlResult instanceof Disjoint) {
				return rlResult.invert()
			}
			// TODO: meta
			return new this.nodeClass(rlResult as never) as never
		}
		return null
	}
}

const innerToJson = (inner: BaseAttributes) => {
	if (isTypeInner(inner)) {
		// collapse single branch schemas like { branches: [{ domain: "string" }] } to { domain: "string" }
		return inner.branches[0].json
	}
	const json: Json = {}
	for (const k in inner) {
		json[k] = innerValueToJson((inner as Dict)[k])
	}
	return json
}

const innerValueToJson = (inner: unknown): JsonData => {
	if (
		typeof inner === "string" ||
		typeof inner === "boolean" ||
		typeof inner === "number" ||
		inner === null
	) {
		return inner
	}
	if (typeof inner === "object") {
		if (inner instanceof BaseNode) {
			return inner.collapsedJson
		}
		if (
			isArray(inner) &&
			inner.every(
				(element): element is UnknownNode => element instanceof BaseNode
			)
		) {
			return inner.map((element) => {
				return element.collapsedJson
			})
		}
	}
	return compileSerializedValue(inner)
}

const isTypeInner = (inner: object): inner is UnionInner => "branches" in inner

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
	: r extends ConstraintKind
	? "constraint" extends keyof IntersectionMap<l>
		? instantiateIntersection<IntersectionMap<l>["constraint"]>
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
