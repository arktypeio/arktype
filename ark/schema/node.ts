import type {
	AbstractableConstructor,
	conform,
	Dict,
	evaluate,
	extend,
	Fn,
	instanceOf,
	isAny,
	Json
} from "@arktype/util"
import { DynamicBase, isArray } from "@arktype/util"
import { type BasisKind } from "./constraints/basis.js"
import type {
	ConstraintClassesByKind,
	ConstraintKind
} from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { compileSerializedValue } from "./io/compile.js"
import type { TypeClassesByKind, validateBranchInput } from "./type.js"

export interface BaseAttributes {
	alias?: string
	description?: string
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
	intersections: IntersectionDefinitions<any>
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

export abstract class BaseNode<
	children extends BaseAttributes,
	nodeClass extends StaticBaseNode<children>
> extends DynamicBase<children> {
	json: Json
	alias: string
	description: string
	ids: NodeIds = new NodeIds(this)
	nodeClass = this.constructor as nodeClass
	readonly kind: nodeClass["kind"] = this.nodeClass.kind

	constructor(public children: children) {
		super(children)
		this.alias = children.alias ?? "generated"
		this.description =
			children.description ??
			(this.constructor as nodeClass).writeDefaultDescription(children)
		this.json = BaseNode.unwrapChildren(children)
	}

	protected static unwrapChildren<nodeClass>(
		this: nodeClass,
		children: childrenOf<nodeClass>
	) {
		const json: Json = {}
		for (const k in children) {
			const child: unknown = children[k]
			if (
				typeof child === "string" ||
				typeof child === "boolean" ||
				typeof child === "number" ||
				child === null
			) {
				json[k] = child
			} else if (typeof child === "object") {
				if (child instanceof BaseNode) {
					json[k] = child.json
				} else if (
					isArray(child) &&
					child.every(
						(element): element is BaseNode<any, any> =>
							element instanceof BaseNode
					)
				) {
					json[k] = child.map((element) => element.json)
				}
			} else {
				json[k] = compileSerializedValue(child)
			}
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

	serialize(kind: keyof NodeIds = "meta") {
		return JSON.stringify(this.json)
	}

	toJSON() {
		return this.json
	}

	equals(other: BaseNode<any, any>) {
		return this.ids.morph === other.ids.morph
	}

	allows(data: unknown) {
		return true
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

	intersect<other extends Node>(
		other: other
	): other["kind"] extends keyof nodeClass["intersections"]
		? ReturnType<
				nodeClass["intersections"][other["kind"]] & {}
		  > extends infer lrIntersection
			? lrIntersection extends null | Disjoint
				? lrIntersection
				: Node<this["kind"]>
			: never
		: other["nodeClass"]["intersections"] extends Record<
				this["kind"],
				Fn<never, infer rlIntersection>
		  >
		? rlIntersection extends null | Disjoint
			? rlIntersection
			: Node<other["kind"]>
		: null
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
