import {
	BaseNode,
	parseNode,
	type BaseAttachments,
	type Node
} from "./parse.js"
import type { BranchKind } from "./sets/union.js"
import type { RefinementKind, Root, SchemaKind } from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf } from "./shared/intersect.js"
import type { Input } from "./shared/nodes.js"
import { inferred } from "./shared/symbols.js"

export class SchemaNode<kind extends SchemaKind, t> extends BaseNode<kind, t> {
	// TODO: standardize name with type
	declare infer: t;
	declare [inferred]: t

	// import we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]

	protected constructor(attachments: BaseAttachments<kind>) {
		super(attachments)
		// in a union, branches will have already been assigned from inner
		// otherwise, initialize it to a singleton array containing the current branch node
		this.branches ??= [this as never]
	}

	constrain<refinementKind extends RefinementKind>(
		kind: refinementKind,
		input: Input<refinementKind>
	): Exclude<intersectionOf<this["kind"], refinementKind>, Disjoint> {
		const refinement = parseNode(kind, input)
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
	or<other extends Root>(
		other: other
	): Node<
		"union" | Extract<kind | other["kind"], SchemaKind>,
		t | other["infer"]
	> {
		return parseNode("union", [...this.branches, ...other.branches]) as never
	}

	isUnknown(): this is BaseNode<"intersection", unknown> {
		return this.equals(BaseNode.builtins.unknown)
	}

	isNever(): this is BaseNode<"union", never> {
		return this.equals(BaseNode.builtins.never)
	}

	getPath() {
		return this
	}

	array(): Node<"intersection", t[]> {
		return this as never
	}

	extends<other extends Root>(
		other: other
	): this is Node<kind, other["infer"]> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export type Schema<kind extends SchemaKind = SchemaKind, t = unknown> = {
	union: SchemaNode<"union", t>
	morph: SchemaNode<"morph", t>
	intersection: SchemaNode<"intersection", t>
	unit: SchemaNode<"unit", t>
	proto: SchemaNode<"proto", t>
	domain: SchemaNode<"domain", t>
}[kind]
