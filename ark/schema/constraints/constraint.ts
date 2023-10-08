import { reify } from "@arktype/util"
import type { extend, Hkt } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import { BaseNode } from "../node.js"
import type { BaseAttributes } from "../types/type.js"
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

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export type ConstraintInput<kind extends ConstraintKind = ConstraintKind> =
	ConstraintInputsByKind[kind]

export type nodeParser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const nodeParser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as nodeParser<node>

export abstract class BaseConstraint<
	schema extends BaseAttributes
> extends BaseNode<schema> {
	abstract kind: ConstraintKind

	abstract intersectSymmetric(
		// this representation avoids circularity errors caused by `this`
		other: ConstraintNode<this["kind"]>
	): schema | Disjoint | null

	abstract intersectAsymmetric(other: ConstraintNode): schema | Disjoint | null

	branches = []

	inId = ""
	outId = ""
	typeId = ""
	metaId = ""

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
