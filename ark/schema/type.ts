import type { entriesOf, entryOf } from "@arktype/util"
import { BaseNode, type BaseAttachments, type Node } from "./base.js"
import type { BranchKind } from "./sets/union.js"
import type { RefinementKind, TypeKind } from "./shared/define.js"
import { Disjoint } from "./shared/disjoint.js"
import type { intersectionOf } from "./shared/intersect.js"
import type { Attachments, Inner, Schema } from "./shared/nodes.js"

export class BaseType<t> extends BaseNode<t> {
	// important we only declare this, otherwise it would reinitialize a union's branches to undefined
	declare readonly branches: readonly Node<BranchKind>[]
	declare readonly kind: TypeKind

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
	): Exclude<intersectionOf<this["kind"], other["kind"]>, Disjoint> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	// TODO: limit input types
	or<other extends TypeNode>(
		other: other
	): TypeNode<t | other["infer"], "union" | this["kind"] | other["kind"]> {
		return this.scope.parseBranches(
			...this.branches,
			...(other.branches as any)
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
	): this is TypeNode<other["infer"]> {
		const intersection = this.intersect(other)
		return (
			!(intersection instanceof Disjoint) && this.equals(intersection as never)
		)
	}
}

export type TypeNode<t = unknown, kind extends TypeKind = TypeKind> = Node<
	kind,
	t
>

interface BaseTypeKindAttachments<t, kind extends TypeKind>
	extends BaseType<t> {
	kind: kind
	inner: Inner<kind>
	entries: entriesOf<Inner<kind>>
	// <childKindOf<kind>>
	children: Node[]
}

export type BaseTypeOfKind<t, kind extends TypeKind> = BaseTypeKindAttachments<
	t,
	kind
> &
	Attachments<kind>

export interface UnionNode<t = unknown> extends BaseTypeOfKind<t, "union"> {}
export interface IntersectionNode<t = unknown>
	extends BaseTypeOfKind<t, "intersection"> {}
export interface MorphNode<t = unknown> extends BaseTypeOfKind<t, "morph"> {}
export interface UnitNode<t = unknown> extends BaseTypeOfKind<t, "unit"> {}
export interface ProtoNode<t = unknown> extends BaseTypeOfKind<t, "proto"> {}
export interface DomainNode<t = unknown> extends BaseTypeOfKind<t, "domain"> {}
