import {
	type BaseAttributes,
	BaseNode,
	type IntersectionResult,
	type StaticBaseNode,
	type UnknownNode
} from "./base.js"
import { builtins } from "./builtins.js"
import type { ConstraintKind } from "./constraints/constraint.js"
import { Disjoint } from "./disjoint.js"
import { constraintClassesByKind } from "./intersection.js"
import { type Root, type RootKind, type Schema } from "./node.js"

export interface StaticRootNode<inner extends BaseAttributes>
	extends StaticBaseNode<inner> {
	readonly kind: RootKind
}

export abstract class RootNode<
	inner extends BaseAttributes,
	nodeClass extends StaticRootNode<inner>,
	t = unknown
> extends BaseNode<inner, nodeClass, t> {
	constrain<kind extends ConstraintKind>(
		kind: kind,
		definition: Schema<kind>
	): Root {
		const result = this.intersect(
			(constraintClassesByKind[kind].from as any)(definition)
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
	and<other extends UnknownNode>(other: other): Root<t & other["infer"]> {
		const result = this.intersect(other)
		return result instanceof Disjoint ? result.throw() : (result as never)
	}

	or<other extends UnknownNode>(
		other: other
	): Root<
		t | other["infer"],
		"union" | this["kind"] | (other["kind"] & RootKind)
	> {
		return this as never
	}

	isUnknown(): this is Root<unknown> {
		return this.equals(builtins.unknown())
	}

	isNever(): this is Root<never> {
		return this.equals(builtins.never())
	}

	getPath() {
		return this
	}

	array(): Root<t[]> {
		return this as never
	}

	extends<other>(other: Root<other>): this is Root<other> {
		const intersection = this.intersect(other)
		return !(intersection instanceof Disjoint) && this.equals(intersection)
	}
}
