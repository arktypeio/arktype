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
	abstract intersectSymmetric(other: this): schema | Disjoint | null

	abstract intersectAsymmetric(other: Constraint): schema | Disjoint | null

	intersectOwnKeys(other: Node) {
		return other.kind === this.kind
			? this.intersectSymmetric(other as never)
			: other.kind === "type" || other.kind === "predicate"
			? null
			: this.intersectAsymmetric(other)
	}
}
