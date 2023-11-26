import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import type { BranchKind } from "./sets/union.js"
import type { RefinementKind, SchemaKind } from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf } from "./shared/intersect.js"
import type { Definition } from "./shared/nodes.js"
import { inferred } from "./shared/symbols.js"

export class SchemaNode<t, kind extends SchemaKind> extends BaseNode<t, kind> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]

	protected constructor(attachments: BaseAttachments<kind>) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	constrain<refinementKind extends RefinementKind>(
		kind: refinementKind,
		input: Definition<refinementKind>
	): Exclude<intersectionOf<this["kind"], refinementKind>, Disjoint> {
		const refinement = this.space.node(kind, input)
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
	or<other extends Schema>(
		other: other
	): Schema<
		t | other["infer"],
		"union" | Extract<kind | other["kind"], SchemaKind>
	> {
		return this.space.node("union", [
			...this.branches,
			...other.branches
		]) as never
	}

	isUnknown(): this is Schema<unknown, "intersection"> {
		return this.hasKind("intersection") && this.constraints.length === 0
	}

	isNever(): this is Schema<never, "union"> {
		return this.hasKind("union") && this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): Schema<t[], "intersection"> {
		return this as never
	}

	extends<other extends Schema>(
		other: other
	): this is Schema<other["infer"], kind> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export type Schema<t = unknown, kind extends SchemaKind = SchemaKind> = {
	union: SchemaNode<t, "union">
	morph: SchemaNode<t, "morph">
	intersection: SchemaNode<t, "intersection">
	unit: SchemaNode<t, "unit">
	proto: SchemaNode<t, "proto">
	domain: SchemaNode<t, "domain">
}[kind]
