import { BaseNode, type intersectionOf, type NodeDeclaration } from "./base.js"
import { type BasisKind } from "./bases/basis.js"
import { Disjoint } from "./disjoint.js"
import { type Node, type Schema } from "./nodes.js"
import type { ConstraintKind } from "./sets/intersection.js"
import { type SetKind } from "./sets/set.js"
import { type inferred } from "./utils.js"

export type Root<t = unknown, kind extends RootKind = RootKind> = Node<kind> & {
	[inferred]: t
	infer: t
}

export type RootKind = SetKind | BasisKind

export abstract class RootNode<
	declaration extends NodeDeclaration,
	t = unknown
> extends BaseNode<declaration, t> {
	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: Schema<kind>
	): Root {
		const result: Disjoint | Node<RootKind> = this.intersect(
			(RootNode.classesByKind[kind].from as any)(definition)
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
		return this.hasKind("intersection") && this.constraints.length === 0
	}

	isNever(): this is Root<never> {
		return this.hasKind("union") && this.branches.length === 0
	}

	getPath() {
		return this
	}

	array(): Root<t[]> {
		return this as never
	}

	extends<other>(this: Root, other: Root<other>): this is Root<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}
