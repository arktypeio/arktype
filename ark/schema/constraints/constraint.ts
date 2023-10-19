import type { extend } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Children, Node, StaticBaseNode } from "../node.js"
import { BaseNode } from "../node.js"
import type { BasisClassesByKind, BasisKind } from "./basis.js"
import type { RefinementClassesByKind } from "./refinement.js"

export type ConstraintClassesByKind = extend<
	BasisClassesByKind,
	RefinementClassesByKind
>

export type ConstraintKind = keyof ConstraintClassesByKind

export abstract class BaseConstraint<
	children extends BaseAttributes,
	nodeClass extends StaticBaseNode<children>
> extends BaseNode<children, nodeClass> {
	abstract kind: ConstraintKind

	constructor(children: children) {
		super(children)
	}

	abstract intersectSymmetric(
		other: Node<this["kind"]>
	): Children<this["kind"]> | Disjoint | null

	abstract intersectAsymmetric(
		other: Node<Exclude<ConstraintKind, this["kind"]>>
	): Children<this["kind"]> | Disjoint | null

	intersectConstraint<other extends BaseConstraint<BaseAttributes, any>>(
		other: other
	):
		| Node<other["kind"] | this["kind"]>
		| Extract<
				Disjoint | null,
				ReturnType<this["intersectOwnKeys"] | other["intersectOwnKeys"]>
		  > {
		return null as never
	}

	intersectOwnKeys(
		other: BaseConstraint<BaseAttributes, any>
	): ReturnType<this["intersectAsymmetric" | "intersectSymmetric"]> {
		return (
			other.kind === this.kind
				? this.intersectSymmetric(other as never)
				: this.intersectAsymmetric(other as never)
		) as never
	}

	isBasis(): this is Node<BasisKind> {
		return (
			this.kind === "domain" || this.kind === "proto" || this.kind === "unit"
		)
	}
}

export const getBasisName = (basis: Node<BasisKind> | undefined) =>
	basis?.basisName ?? "unknown"

export const precedenceByConstraint: Record<ConstraintKind, number> = {
	// basis
	domain: 0,
	proto: 0,
	unit: 0,
	// shallow
	min: 1,
	max: 1,
	divisor: 1,
	pattern: 1,
	// deep
	prop: 2,
	// narrow
	predicate: 3
}
