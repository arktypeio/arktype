import type { extend } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node } from "../node.js"
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
	abstract kind: ConstraintKind

	abstract intersectSymmetric(
		// this representation avoids circularity errors caused by `this`
		other: Node<this["kind"]>
	): this["children"] | Disjoint | null

	abstract intersectAsymmetric(
		other: Node<ConstraintKind>
	): this["children"] | Disjoint | null

	inId = ""
	outId = ""
	typeId = ""

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

	intersectOwnKeys(other: Node<ConstraintKind>) {
		return other.kind === this.kind
			? (this.intersectSymmetric(other as never) as ReturnType<
					this["intersectSymmetric"]
			  >)
			: (this.intersectAsymmetric(other) as ReturnType<
					this["intersectAsymmetric"]
			  >)
	}
}
