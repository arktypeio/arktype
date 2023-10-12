import type { extend } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { BaseNode } from "../node.js"
import type {
	BasesByKind,
	BasisClassesByKind,
	BasisInputsByKind,
	BasisKind
} from "./basis.js"
import type {
	RefinementClassesByKind,
	RefinementInputsByKind,
	RefinementsByKind
} from "./refinement.js"

export type ConstraintClassesByKind = extend<
	BasisClassesByKind,
	RefinementClassesByKind
>

export type ConstraintInputsByKind = extend<
	BasisInputsByKind,
	RefinementInputsByKind
>

export type ConstraintsByKind = extend<BasesByKind, RefinementsByKind>

export type ConstraintKind = keyof ConstraintsByKind

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export type ConstraintInput<kind extends ConstraintKind = ConstraintKind> =
	ConstraintInputsByKind[kind]

export abstract class BaseConstraint<
	children extends BaseAttributes = BaseAttributes
> extends BaseNode<children> {
	abstract kind: ConstraintKind

	abstract intersectSymmetric(
		// this representation avoids circularity errors caused by `this`
		other: ConstraintNode<this["kind"]>
	): this["children"] | Disjoint | null

	abstract intersectAsymmetric(
		other: ConstraintNode
	): this["children"] | Disjoint | null

	inId = ""
	outId = ""
	typeId = ""

	intersectConstraint<other extends ConstraintNode>(
		other: other
	):
		| ConstraintNode<other["kind"] | this["kind"]>
		| Extract<
				Disjoint | null,
				ReturnType<this["intersectOwnKeys"] | other["intersectOwnKeys"]>
		  > {
		return null as never
	}

	intersectOwnKeys(other: ConstraintNode) {
		return other.kind === this.kind
			? (this.intersectSymmetric(other as never) as ReturnType<
					this["intersectSymmetric"]
			  >)
			: (this.intersectAsymmetric(other) as ReturnType<
					this["intersectAsymmetric"]
			  >)
	}
}
