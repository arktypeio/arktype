import type { extend, Hkt } from "@arktype/util"
import { DynamicBase, reify } from "@arktype/util"
import type {
	BasisKind,
	ConstraintClassesByKind,
	ConstraintKind,
	ConstraintsByKind
} from "./constraints/constraint.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

export interface BaseSchema {
	description?: string
}

export type parser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const parser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as parser<node>

export type parse<
	node extends { hkt: Hkt },
	parameters extends Parameters<node["hkt"]["f"]>[0]
> = Hkt.apply<node["hkt"], parameters>

export type BasisInput = inputFor<BasisKind> | undefined

export abstract class BaseNode<
	schema extends BaseSchema = BaseSchema
> extends DynamicBase<schema> {
	abstract kind: NodeKind

	abstract infer: unknown

	protected constructor(public schema: schema) {
		super(schema)
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}

	// 	intersect(other: this): this | Disjoint {
	// 		if (this === other) {
	// 			return this
	// 		}
	// 		const intersection = methods.intersect(this.definition, other.definition)
	// 		return intersection instanceof Disjoint
	// 			? intersection
	// 			: new this.ownConstructor(intersection as never)
	// 	}
	// }

	id = this.hash()

	// TODO: remove-

	equals(other: BaseNode) {
		return this.id === other.id
	}

	abstract hash(): string

	abstract writeDefaultDescription(): string
}

export type inputFor<kind extends ConstraintKind> = {
	[k in kind]: Parameters<ConstraintClassesByKind[k]["from"]>[0]
}[kind]

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	{
		type: typeof TypeNode
		predicate: typeof PredicateNode
	}
>

export type NodesByKind = extend<
	ConstraintsByKind,
	{
		type: TypeNode
		predicate: PredicateNode
	}
>

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]
