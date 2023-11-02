import { type satisfy } from "@arktype/util"
import {
	BaseNode,
	type BaseNodeDeclaration,
	type intersectionOf
} from "./base.js"
import { type BasisKind } from "./bases/basis.js"
import { type DomainNode } from "./bases/domain.js"
import { type ProtoNode } from "./bases/proto.js"
import { type UnitNode } from "./bases/unit.js"
import { type ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { type Node, type Schema } from "./nodes.js"
import { type IntersectionNode } from "./sets/intersection.js"
import { type MorphNode } from "./sets/morph.js"
import { type SetKind } from "./sets/set.js"
import { type UnionNode } from "./sets/union.js"
import { inferred } from "./utils.js"

type typedRootsByKind<t> = satisfy<
	{ [k in RootKind]: Node<k> },
	{
		union: UnionNode<t>
		morph: MorphNode<t>
		intersection: IntersectionNode<t>
		unit: UnitNode<t>
		proto: ProtoNode<t & object>
		domain: DomainNode<t>
	}
>

export type Root<
	t = unknown,
	kind extends RootKind = RootKind
> = typedRootsByKind<t>[kind]

export type RootKind = SetKind | BasisKind

export abstract class BaseRoot<
	declaration extends BaseNodeDeclaration,
	t
> extends BaseNode<declaration, t> {
	declare [inferred]: t
	declare infer: t

	constrain<kind extends ConstraintKind>(
		this: Node<RootKind>,
		kind: kind,
		definition: Schema<kind>
	): Root {
		const result: Disjoint | Node<RootKind> = this.intersect(
			(BaseRoot.classesByKind[kind].parse as any)(
				definition
			) as Node<ConstraintKind>
		)
		return result instanceof Disjoint ? result.throw() : result
	}

	keyof() {
		return this
		// return this.rule.reduce(
		// 	(result, branch) => result.and(branch.keyof()),
		// 	builtins.unknown()
		// )
	}

	// TODO: inferIntersection
	and<other extends Node>(
		other: other
	): Exclude<intersectionOf<this["kind"], other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<other extends Node>(
		other: other
	): Root<
		t | other["infer"],
		"union" | Extract<this["kind"] | other["kind"], RootKind>
	> {
		return this as never
	}

	isUnknown(): this is Root<unknown> {
		return this.hasKind("intersection") && this.children.length === 0
	}

	isNever(): this is Root<never> {
		return this.hasKind("union") && this.children.length === 0
	}

	getPath() {
		return this
	}

	array(): Root<t[]> {
		return this as never
	}

	extends<other extends Node>(
		this: Node<RootKind>,
		other: other
	): this is Root<other["infer"]> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}

	subsumes(other: Root): other is Root<this["infer"]> {
		return other.extends(this as never)
	}
}
