import { BaseNode } from "./node.js"
import { parseSchema, type BaseAttachments } from "./parse.js"
import type { BranchKind } from "./sets/union.js"
import type { RefinementKind, Root, TypeKind } from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf } from "./shared/intersect.js"
import type { Node, Schema } from "./shared/node.js"
import { inferred } from "./shared/symbols.js"

export class BaseType<
	kind extends TypeKind = TypeKind,
	t = unknown
> extends BaseNode<kind, t> {
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
		schema: Schema<refinementKind>
	): Exclude<intersectionOf<this["kind"], refinementKind>, Disjoint> {
		const refinement = parseSchema(kind, schema)
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
		"union" | Extract<kind | other["kind"], TypeKind>,
		t | other["infer"]
	> {
		return parseSchema("union", [...this.branches, ...other.branches]) as never
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
