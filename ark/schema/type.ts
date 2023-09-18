import type { extend, Hkt } from "@arktype/util"
import { DynamicBase, reify } from "@arktype/util"
import type {
	ConstraintClassesByKind,
	ConstraintInputsByKind,
	ConstraintKind,
	ConstraintsByKind
} from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import type { PredicateInput, PredicateNode } from "./predicate.js"
import type { BranchNode, TypeInput } from "./union.js"
import { inferred } from "./utils.js"

export interface BaseAttributes {
	alias?: string
	description?: string
}

export abstract class TypeNode<
	t = unknown,
	schema extends BaseAttributes = BaseAttributes
> extends DynamicBase<schema> {
	abstract kind: NodeKind

	declare infer: t;
	declare [inferred]: t
	declare condition: string

	description: string
	alias: string

	protected constructor(public schema: schema) {
		super(schema)
		this.description ??= this.writeDefaultDescription()
		this.alias ??= "generated"
	}

	abstract inId: string
	abstract outId: string
	abstract typeId: string
	abstract metaId: string
	abstract writeDefaultDescription(): string
	abstract branches: readonly BranchNode[]
	declare children: TypeNode[]

	equals(other: TypeNode) {
		return this.typeId === other.typeId
	}

	extractUnit() {
		return this.branches.length === 1 && this.branches[0].kind === "predicate"
			? this.branches[0].extractUnit()
			: undefined
	}

	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: inputOf<kind>
	): TypeNode<t> {
		return this
	}

	references() {
		return this.branches.flatMap((branch) => branch.references())
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	allows(data: unknown) {
		return true
	}

	and<other extends TypeNode>(
		other: other // TODO: inferIntersection
	): TypeNode<t & other["infer"]> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	intersect(other: TypeNode) {
		const resultBranches = intersectBranches(this.branches, other.branches)
		if (resultBranches.length === 0) {
			return Disjoint.from("union", this.branches, other.branches)
		}
		return new TypeNode({
			branches: resultBranches
		})
	}

	or<other extends TypeNode>(other: other): TypeNode<t | other["infer"]> {
		return this
	}

	isUnknown(): this is PredicateNode<unknown> {
		return this.branches[1].constraints.length === 0
	}

	isNever(): this is TypeNode<never> {
		return this.branches.length === 0
	}

	array(): TypeNode<t[]> {
		return new TypeNode({ branches: [] })
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}

export type nodeParser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const nodeParser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as nodeParser<node>

export type parseNode<
	node extends { hkt: Hkt },
	parameters extends Parameters<node["hkt"]["f"]>[0]
> = Hkt.apply<node["hkt"], parameters>

export type inputOf<kind extends NodeKind> = extend<
	ConstraintInputsByKind,
	{
		type: TypeInput
		predicate: PredicateInput
	}
>[kind]

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
