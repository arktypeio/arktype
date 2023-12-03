import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "./base.js"
import type {
	IntersectionDeclaration,
	IntersectionNode
} from "./sets/intersection.js"
import type { BranchKind, UnionNode } from "./sets/union.js"
import type { RefinementKind, TypeKind } from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf } from "./shared/intersect.js"
import type { Schema } from "./shared/nodes.js"

export interface TypeSubclass extends NodeSubclass {
	readonly kind: TypeKind
}

export abstract class BaseType<
	t = unknown,
	subclass extends TypeSubclass = TypeSubclass
> extends BaseNode<t, subclass> {
	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]

	constructor(attachments: BaseAttachments) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	constrain<refinementKind extends RefinementKind>(
		kind: refinementKind,
		input: Schema<refinementKind>
	): Exclude<intersectionOf<this["kind"], refinementKind>, Disjoint> {
		const refinement = this.scope.parseNode(kind, input)
		return this.and(refinement) as never
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
	): Exclude<intersectionOf<subclass["kind"], other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends TypeNode>(
		other: other
	): TypeNode<t | other["infer"], "union" | subclass["kind"] | other["kind"]> {
		return this.scope.parseBranches(
			...this.branches,
			...(other.branches as any)
		) as never
	}

	isUnknown(): this is IntersectionNode<unknown> {
		return this.hasKind("intersection") && this.constraints.length === 0
	}

	isNever(): this is UnionNode<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): IntersectionNode<t[]> {
		return this as never
	}

	extends<other extends TypeNode>(other: other) {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}
