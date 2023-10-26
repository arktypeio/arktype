import type {
	AbstractableConstructor,
	conform,
	Dict,
	evaluate,
	extend,
	Fn,
	instanceOf,
	isAny,
	Json,
	JsonData,
	listable,
	returnOf
} from "@arktype/util"
import { DynamicBase, isArray, isKeyOf } from "@arktype/util"
import { type BasisKind } from "./constraints/basis.js"
import type {
	ConstraintClassesByKind,
	ConstraintKind
} from "./constraints/constraint.js"
import { type RefinementContext } from "./constraints/refinement.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue, In } from "./io/compile.js"
import { registry } from "./io/registry.js"
import type {
	TypeClassesByKind,
	TypeInner,
	TypeNode,
	validateBranchInput
} from "./type.js"
import { type ValidatorInner, type ValidatorNode } from "./validator.js"

export interface BaseAttributes {
	readonly alias?: string
	readonly description?: string
}

export const baseAttributeKeys = {
	alias: 1,
	description: 1
} as const satisfies Record<keyof BaseAttributes, 1>

export const schema = <const branches extends readonly unknown[]>(
	...branches: {
		[i in keyof branches]: validateBranchInput<branches[i]>
	}
) => branches

const prevalidated = Symbol("used to bypass validation when creating a node")

export type Prevalidated = typeof prevalidated

export interface StaticBaseNode<inner extends BaseAttributes> {
	new (inner: inner): BaseNode<inner, any>
	kind: NodeKind
	keyKinds: Record<keyof inner, keyof NodeIds>
	from(input: inner, ctx: RefinementContext): BaseNode<inner, any>
	childrenOf?(inner: inner): readonly UnknownNode[]
	intersections: IntersectionDefinitions<any>
	compile(inner: inner): string
	writeDefaultDescription(inner: inner): string
}

type IntersectionGroup = NodeKind | "constraint"

type IntersectionDefinitions<nodeClass> = evaluate<
	{
		[k in kindOf<nodeClass>]: intersectionOf<nodeClass, k>
	} & {
		[k in IntersectionGroup]?: intersectionOf<nodeClass, k>
	}
>

export const irreducibleRefinementKinds = {
	pattern: 1,
	predicate: 1,
	prop: 1
} as const

export type IrreducibleRefinementKind = keyof typeof irreducibleRefinementKinds

type intersectionOf<nodeClass, k extends IntersectionGroup> = (
	// allow assignment from instance type to base
	l: isAny<nodeClass> extends true ? never : instanceOf<nodeClass>,
	r: Node<
		k extends NodeKind ? k : k extends "constraint" ? ConstraintKind : never
	>
) =>
	| innerOf<nodeClass>
	| Disjoint
	// ensure null is not allowed as a return on reducible symmetric intersections
	| (k extends kindOf<nodeClass>
			? k extends IrreducibleRefinementKind
				? null
				: never
			: null)

type innerOf<nodeClass> = ConstructorParameters<
	conform<nodeClass, AbstractableConstructor>
>[0]

type childrenOf<nodeClass extends StaticBaseNode<any>> =
	nodeClass["childrenOf"] extends Fn<
		never,
		infer children extends readonly unknown[]
	>
		? children
		: readonly []

type kindOf<nodeClass> = instanceOf<nodeClass> extends {
	kind: infer kind extends NodeKind
}
	? kind
	: never

type extensionKeyOf<nodeClass> = Exclude<
	keyof innerOf<nodeClass>,
	keyof BaseAttributes
>

type UnknownNode = BaseNode<any, any>

const $ark = registry()

export abstract class BaseNode<
	inner extends BaseAttributes,
	nodeClass extends StaticBaseNode<inner>
> extends DynamicBase<inner> {
	readonly json: Json
	readonly collapsedJson: JsonData
	readonly children: childrenOf<nodeClass>
	readonly references: readonly UnknownNode[]
	protected readonly contributesReferences: readonly UnknownNode[]
	readonly alias: string
	readonly description: string
	readonly ids: NodeIds = new NodeIds(this)
	readonly nodeClass = this.constructor as nodeClass
	readonly kind: nodeClass["kind"] = this.nodeClass.kind
	readonly condition: string

	allows(data: unknown) {
		return true
	}

	constructor(public readonly inner: inner) {
		super(inner)
		this.alias = $ark.register(this, inner.alias)
		this.description =
			inner.description ??
			(this.constructor as nodeClass).writeDefaultDescription(inner)
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

	protected static defineIntersections<
		nodeClass,
		intersections extends IntersectionDefinitions<nodeClass>
	>(this: nodeClass, intersections: intersections) {
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
	intersect<other extends Node>(
		other: other
	): IntersectionResult<this["kind"], other["kind"]>
	intersect(
		other: BaseNode<BaseAttributes, StaticBaseNode<BaseAttributes>>
	): UnknownNode | Disjoint | null {
		if (other.ids.morph === this.ids.morph) {
			// TODO: meta
			return this
		}
		const lrIntersection = this.nodeClass.intersections[other.kind]
		if (lrIntersection) {
			const result = lrIntersection(this as never, other as never)
			// TODO: meta
			return result instanceof Disjoint
				? result
				: new this.nodeClass(result as never)
		}
		const rlIntersection = other.nodeClass.intersections[this.kind]
		if (rlIntersection) {
			const result = rlIntersection(other as never, this as never)
			// TODO: meta
			return result instanceof Disjoint
				? result.invert()
				: new this.nodeClass(result as never)
		}
		return null
	}
}

// this function should only be called during initialization to
// avoiding adding duplicate children
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

const isTypeInner = (inner: object): inner is TypeInner => "branches" in inner

type IntersectionResult<
	l extends NodeKind,
	r extends NodeKind
> = r extends keyof NodeClass<l>["intersections"]
	? instantiateIntersection<l, returnOf<NodeClass<l>["intersections"][r]>>
	: [r, NodeClass<l>["intersections"]] extends [
			ConstraintKind,
			Record<"constraint", Fn<never, infer lrIntersection>>
	  ]
	? instantiateIntersection<l, lrIntersection>
	: NodeClass<r>["intersections"] extends Record<
			r,
			Fn<never, infer rlIntersection>
	  >
	? instantiateIntersection<r, rlIntersection>
	: null

type instantiateIntersection<
	kind extends NodeKind,
	result
> = result extends null | Disjoint ? result : Node<kind>

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

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	TypeClassesByKind
>

export type NodeKind = keyof NodeClassesByKind

export type NodeClass<kind extends NodeKind = NodeKind> =
	NodeClassesByKind[kind]

export type Schema<kind extends NodeKind> = Parameters<
	NodeClass<kind>["from"]
>[0]

export type unwrap<kind extends NodeKind> = ConstructorParameters<
	NodeClass<kind>
>[0]

export type Node<kind extends NodeKind = NodeKind> = InstanceType<
	NodeClass<kind>
>
