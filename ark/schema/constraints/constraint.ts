import type { Constructor, extend } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type {
	BaseAttributes,
	Children,
	Node,
	NodeClass,
	StaticBaseNode
} from "../node.js"
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

	intersect<other extends BaseConstraint<BaseAttributes, any>>(
		other: other
	):
		| Node<other["kind"] | this["kind"]>
		| Extract<
				Disjoint | null,
				ReturnType<(this | other)["intersectAsymmetric" | "intersectSymmetric"]>
		  >
	intersect(other: BaseConstraint<BaseAttributes, any>) {
		if (other.kind === this.kind) {
			return this.intersectSymmetric(other as never)
		}
		let resultClass: StaticBaseNode<any> | undefined
		let result = this.intersectAsymmetric(other as never)
		if (result) {
			resultClass = this.nodeClass as never
		} else {
			result = other.intersectAsymmetric(this as never)
			if (result) {
				resultClass === other.nodeClass
			}
		}
		if (result === null || result instanceof Disjoint) {
			return result
		}
		// TODO: Add meta
		return new resultClass!(result)
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
