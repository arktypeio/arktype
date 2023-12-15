import type { extend } from "@arktype/util"
import {
	BaseNode,
	type BaseAttachments,
	type Node,
	type NodeSubclass,
	type TypeNode
} from "../base.js"
import type { Schema, hasOpenIntersection } from "../kinds.js"
import type { BaseNodeDeclaration } from "../shared/declare.js"
import type { RefinementKind, TypeKind } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { intersectionOf } from "../shared/intersect.js"
import { inferred } from "../shared/utils.js"
import type { IntersectionNode } from "./intersection.js"
import type { extractOut } from "./morph.js"
import type { BranchKind, UnionNode } from "./union.js"

export type BaseTypeDeclaration = extend<
	BaseNodeDeclaration,
	{ kind: TypeKind }
>

export abstract class BaseType<
	t,
	d extends BaseTypeDeclaration,
	subclass extends NodeSubclass<d>
> extends BaseNode<t, d, subclass> {
	declare infer: extractOut<t>;
	declare [inferred]: t

	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]

	hasOpenIntersection = false as hasOpenIntersection<d>

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
	): Exclude<intersectionOf<d["kind"], other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends TypeNode>(
		other: other
	): TypeNode<t | other["infer"], "union" | d["kind"] | other["kind"]> {
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
		return this.scope.parsePrereduced("intersection", {
			basis: Array,
			sequence: this
		})
	}

	extends<other extends TypeNode>(other: other) {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}
