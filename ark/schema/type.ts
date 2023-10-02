import type { Dict, extend, Hkt, satisfy } from "@arktype/util"
import { DynamicBase, reify } from "@arktype/util"
import type {
	ConstraintClassesByKind,
	ConstraintInputsByKind,
	ConstraintKind,
	ConstraintsByKind
} from "./constraints/constraint.js"
import type { UnitNode } from "./constraints/unit.js"
import { Disjoint } from "./disjoint.js"
import type { IntersectionInput, IntersectionNode } from "./intersection.js"
import type { MorphInput, MorphNode } from "./morph.js"
import { node } from "./node.js"
import type { BranchNode, UnionInput, UnionNode } from "./union.js"
import { intersectBranches } from "./union.js"
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
	metaId = this.writeMetaId()

	private writeMetaId() {
		return JSON.stringify({
			type: this.typeId,
			description: this.description,
			alias: this.alias
		})
	}

	abstract writeDefaultDescription(): string
	abstract branches: readonly BranchNode[]
	declare children: TypeNode[]

	equals(other: TypeNode) {
		return this.typeId === other.typeId
	}

	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: inputOf<kind>
	): TypeNode<t> {
		return this
	}

	extractUnit(): UnitNode | undefined {
		return this.branches.length === 1 &&
			this.branches[0].kind === "intersection"
			? this.branches[0].extractUnit()
			: undefined
	}

	// references() {
	// 	return this.branches.flatMap((branch) => branch.references())
	// }

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

	// TODO: inferIntersection
	and<other extends TypeNode>(other: other): TypeNode<t & other["infer"]> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	intersect<other extends TypeNode>(
		other: other
	): Node<intersectNodeKinds<this["kind"], other["kind"]>> | Disjoint {
		const resultBranches = intersectBranches(this.branches, other.branches)
		if (resultBranches.length === 0) {
			return Disjoint.from("union", this.branches, other.branches)
		}
		return node(...(resultBranches as any)) as never
	}

	or<other extends TypeNode>(other: other): TypeNode<t | other["infer"]> {
		return this
	}

	hasKind<kind extends NodeKind>(kind: kind): this is Node<kind> {
		return this.kind === kind
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") ? this.constraints.length === 0 : false
	}

	isNever(): this is UnionNode<never> {
		return this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): TypeNode<t[]> {
		return node()
	}

	extends<other>(other: TypeNode<other>): this is TypeNode<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}

type intersectNodeKinds<l extends NodeKind, r extends NodeKind> = [
	l,
	r
] extends ["unit", unknown] | [unknown, "unit"]
	? "unit"
	: "union" extends l | r
	? NodeKind
	: "morph" extends l | r
	? "morph"
	: "intersection" | ((l | r) & ConstraintKind)

export type nodeParser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const nodeParser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as nodeParser<node>

export type parseNode<
	node extends { hkt: Hkt },
	parameters extends Parameters<node["hkt"]["f"]>[0]
> = Hkt.apply<node["hkt"], parameters>

export type CompositeInputsByKind = satisfy<
	Dict<CompositeKind>,
	{
		union: UnionInput
		intersection: IntersectionInput
		morph: MorphInput
	}
>

export type NodeInputsByKind = extend<
	CompositeInputsByKind,
	ConstraintInputsByKind
>

export type inputOf<kind extends NodeKind> = NodeInputsByKind[kind]

export type CompositeClassesByKind = satisfy<
	Dict<CompositeKind>,
	{
		union: typeof UnionNode
		morph: typeof MorphNode
		intersection: typeof IntersectionNode
	}
>

export type NodeClassesByKind = extend<
	ConstraintClassesByKind,
	CompositeClassesByKind
>

export type CompositeNodesByKind = {
	union: UnionNode
	intersection: IntersectionNode
	morph: MorphNode
}

export type CompositeKind = keyof CompositeNodesByKind

export type NodesByKind = extend<ConstraintsByKind, CompositeNodesByKind>

export type NodeKind = keyof NodesByKind

export type Node<kind extends NodeKind = NodeKind> = NodesByKind[kind]
