import type { extend } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node, Schema } from "../node.js"
import { BaseNode } from "../node.js"
import type { BasisClassesByKind } from "./basis.js"
import type { RefinementClassesByKind } from "./refinement.js"

export type ConstraintClassesByKind = extend<
	BasisClassesByKind,
	RefinementClassesByKind
>

export type ConstraintKind = keyof ConstraintClassesByKind

export abstract class BaseConstraint<
	children extends BaseAttributes = BaseAttributes
> extends BaseNode<children> {
	constructor(children: children) {
		super(children, {
			in: "",
			out: "",
			type: "",
			reference: ""
		})
	}

	abstract intersectSymmetric(
		// this representation avoids circularity errors caused by `this`
		other: Node<this["kind"]>
	): Schema<this["kind"]> | Disjoint | null

	abstract intersectAsymmetric(
		other: Node<ConstraintKind>
	): Schema<this["kind"]> | Disjoint | null

	intersectConstraint<other extends Node<ConstraintKind>>(
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
		other: Node<ConstraintKind>
	):
		| ReturnType<this["intersectAsymmetric"]>
		| ReturnType<this["intersectSymmetric"]>
	intersectOwnKeys(other: Node<ConstraintKind>) {
		return other.kind === this.kind
			? this.intersectSymmetric(other as never)
			: this.intersectAsymmetric(other)
	}
}
