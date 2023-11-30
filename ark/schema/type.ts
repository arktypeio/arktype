import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import type { extractOut } from "./sets/morph.js"
import type { BranchKind } from "./sets/union.js"
import type { RefinementKind, TypeKind } from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf } from "./shared/intersect.js"
import type { Schema } from "./shared/nodes.js"
import { inferred } from "./shared/symbols.js"

export class BaseType<t, kind extends TypeKind> extends BaseNode<t, kind> {
	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]

	constructor(attachments: BaseAttachments<kind>) {
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
	): Exclude<intersectionOf<kind, other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends TypeNode>(
		other: other
	): TypeNode<
		t | other["infer"],
		"union" | Extract<kind | other["kind"], TypeKind>
	> {
		return this.scope.parseBranches(
			...this.branches,
			...other.branches
		) as never
	}

	isUnknown(): this is TypeNode<unknown, "intersection"> {
		return this.hasKind("intersection") && this.constraints.length === 0
	}

	isNever(): this is TypeNode<never, "union"> {
		return this.hasKind("union") && this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): TypeNode<t[], "intersection"> {
		return this as never
	}

	extends<other extends TypeNode>(
		other: other
	): this is TypeNode<other["infer"], kind> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export type TypeNode<t = unknown, kind extends TypeKind = TypeKind> = {
	union: BaseType<t, "union">
	morph: BaseType<t, "morph">
	intersection: BaseType<t, "intersection">
	unit: BaseType<t, "unit">
	proto: BaseType<t, "proto">
	domain: BaseType<t, "domain">
}[kind]
