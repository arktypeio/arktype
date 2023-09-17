import type { extend } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseAttributes, Node } from "../schema.js"
import { BaseNode } from "../schema.js"
import type {
	BasesByKind,
	BasisClassesByKind,
	BasisInputsByKind
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

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export type ConstraintInput<kind extends ConstraintKind = ConstraintKind> =
	ConstraintInputsByKind[kind]

export abstract class BaseConstraint<
	schema extends BaseAttributes
> extends BaseNode<schema> {
	abstract kind: ConstraintKind

	abstract intersectSymmetric(
		// this representation avoids circularity errors caused by `this`
		other: Constraint<this["kind"]>
	): schema | Disjoint | null

	abstract intersectAsymmetric(other: Constraint): schema | Disjoint | null

	intersect<other extends Constraint>(
		other: other
	):
		| Constraint<other["kind"] | this["kind"]>
		| Extract<
				Disjoint | null,
				ReturnType<this["intersectOwnKeys"] | other["intersectOwnKeys"]>
		  > {
		return null as never
	}

	intersectOwnKeys(other: Constraint) {
		return other.kind === this.kind
			? (this.intersectSymmetric(other as never) as ReturnType<
					this["intersectSymmetric"]
			  >)
			: (this.intersectAsymmetric(other) as ReturnType<
					this["intersectAsymmetric"]
			  >)
	}
}
