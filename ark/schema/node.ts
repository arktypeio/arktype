import type {
	AbstractableConstructor,
	conform,
	Dict,
	extend,
	Json
} from "@arktype/util"
import { DynamicBase, isArray } from "@arktype/util"
import type { ConstraintClassesByKind } from "./constraints/constraint.js"
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

// TODO: Terminal nodes have a condition that is compiled directly
// Also should be associated with a problem type for if that conditions fails

// Nonterminal nodes would compile their logic in some arbitrary function TBD

// NOTE: utilize composition, don't worry about e.g. having to call a function from each terminal node

export interface StaticBaseNode<children extends BaseAttributes> {
	new (children: children): BaseNode<children, any>
	keyKinds: Record<keyof children, keyof NodeIds>
	writeDefaultDescription(children: children): string
}

type childrenOf<nodeClass> = ConstructorParameters<
	conform<nodeClass, AbstractableConstructor>
>[0]

type extensionKeyOf<nodeClass> = Exclude<
	keyof childrenOf<nodeClass>,
	keyof BaseAttributes
>

export abstract class BaseNode<
	children extends BaseAttributes,
	nodeClass extends StaticBaseNode<children>
> extends DynamicBase<children> {
	abstract kind: NodeKind
	declare condition: string

	json: Json
	alias: string
	description: string
	ids: NodeIds = new NodeIds(this)
	nodeClass = this.constructor as nodeClass

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

	toString() {
		return this.description
	}

	abstract intersectSymmetric(
		other: Node<this["kind"]>
	): Children<this["kind"]> | Disjoint | null

	abstract intersectAsymmetric(
		other: never
	): Children<this["kind"]> | Disjoint | null

	intersect<
		other extends Parameters<
			InstanceType<nodeClass>["intersectSymmetric" | "intersectAsymmetric"]
		>[0]
	>(
		other: other
	):
		| Node<other["kind"] | this["kind"]>
		| (other extends InstanceType<nodeClass>
				? never
				: Extract<
						Disjoint | null,
						ReturnType<(this | other)["intersectAsymmetric"]>
				  >)
	intersect(other: BaseNode<Record<string, unknown>, any>) {
		if (other.ids.morph === this.ids.morph) {
			// TODO: meta
			return this
		}
		if (other.kind === this.kind) {
			return this.intersectSymmetric(other as never)
		}
		let resultClass: StaticBaseNode<any> | undefined
		let result = this.intersectAsymmetric(other as never)
		if (result) {
			resultClass = this.nodeClass as never
		} else {
			result = other.intersectAsymmetric(this as never)
			if (result) {
				resultClass === other.nodeClass
			}
		}
		if (result === null || result instanceof Disjoint) {
			return result
		}
		// TODO: Add meta
		return new resultClass!(result)
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
