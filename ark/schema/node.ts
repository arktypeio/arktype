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
	returnOf
} from "@arktype/util"
import { DynamicBase, hasKey, isArray, isKeyOf } from "@arktype/util"
import { type BasisKind } from "./constraints/basis.js"
import type {
	ConstraintClassesByKind,
	ConstraintKind
} from "./constraints/constraint.js"
import { type RefinementContext } from "./constraints/refinement.js"
import { Disjoint } from "./disjoint.js"
import {
	type CompilationState,
	compileSerializedValue,
	In
} from "./io/compile.js"
import { registry } from "./io/registry.js"
import type {
	TypeChildren,
	TypeClassesByKind,
	validateBranchInput
} from "./type.js"

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

export interface StaticBaseNode<children extends BaseAttributes> {
	new (children: children): BaseNode<children, any>
	kind: NodeKind
	keyKinds: Record<keyof children, keyof NodeIds>
	from(input: children, ctx: RefinementContext): BaseNode<children, any>
	intersections: IntersectionDefinitions<any>
	// compile(children: children, state: CompilationState): string
	writeDefaultDescription(children: children): string
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
	| childrenOf<nodeClass>
	| Disjoint
	// ensure null is not allowed as a return on reducible symmetric intersections
	| (k extends kindOf<nodeClass>
			? k extends IrreducibleRefinementKind
				? null
				: never
			: null)

type childrenOf<nodeClass> = ConstructorParameters<
	conform<nodeClass, AbstractableConstructor>
>[0]

type kindOf<nodeClass> = instanceOf<nodeClass> extends {
	kind: infer kind extends NodeKind
}
	? kind
	: never

type extensionKeyOf<nodeClass> = Exclude<
	keyof childrenOf<nodeClass>,
	keyof BaseAttributes
>

type UnknownNode = BaseNode<any, any>

const $ark = registry()

export abstract class BaseNode<
	children extends BaseAttributes,
	nodeClass extends StaticBaseNode<children>
> extends DynamicBase<children> {
	readonly json: Json
	readonly alias: string
	readonly description: string
	readonly ids: NodeIds = new NodeIds(this)
	readonly onlyChild: UnknownNode | undefined
	readonly nodeClass = this.constructor as nodeClass
	readonly kind: nodeClass["kind"] = this.nodeClass.kind

	allows(data: unknown) {
		return true
	}

	constructor(public readonly children: children) {
		super(children)
		this.alias = $ark.register(this, children.alias)
		this.description =
			children.description ??
			(this.constructor as nodeClass).writeDefaultDescription(children)
		this.json = BaseNode.toSerializable(children)
		this.onlyChild =
			Object.keys(this.children).length === 1 &&
			isKeyOf(this.kind, this.children)
				? (this.children[this.kind] as UnknownNode)
				: undefined
	}

	protected static toSerializable<nodeClass>(
		this: nodeClass,
		children: childrenOf<nodeClass>
	) {
		// TS doesn't like to narrow the input type
		const maybeTypeChildren: object = children
		if (isTypeChildren(maybeTypeChildren)) {
			// collapse single branch schemas like { branches: [{ domain: "string" }] } to { domain: "string" }
			return maybeTypeChildren.branches[0].json
		}
		const json: Json = {}
		for (const k in children) {
			json[k] = unwrapChild(children[k])
		}
		return json
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
			[k in keyof childrenOf<nodeClass>]-?: keyof NodeIds
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
		compiler: (children: childrenOf<nodeClass>) => string
	) {
		return compiler
	}

	protected static compileCheck<nodeClass>(
		this: nodeClass,
		compiler: (children: childrenOf<nodeClass>) => string
	) {}

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
	): BaseNode<any, any> | Disjoint | null {
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

const unwrapChild = (child: unknown): JsonData => {
	if (
		typeof child === "string" ||
		typeof child === "boolean" ||
		typeof child === "number" ||
		child === null
	) {
		return child
	}
	if (typeof child === "object") {
		if (child instanceof BaseNode) {
			return unwrapNode(child)
		}
		if (
			isArray(child) &&
			child.every(
				(element): element is UnknownNode => element instanceof BaseNode
			)
		) {
			return child.map((element) => unwrapNode(element))
		}
	}
	return compileSerializedValue(child)
}

/** collapse schemas like { domain: { domain: "string" } } to { domain: "string" } **/
const unwrapNode = (child: UnknownNode) => child.onlyChild?.json ?? child.json

const isTypeChildren = (children: object): children is TypeChildren =>
	"branches" in children

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

	constructor(private node: BaseNode<any, any>) {}

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

export type Children<kind extends NodeKind> = ConstructorParameters<
	NodeClass<kind>
>[0]

export type Node<kind extends NodeKind = NodeKind> = InstanceType<
	NodeClass<kind>
>
