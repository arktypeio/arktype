import type { extend, Hkt } from "@arktype/util"
import { reify } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import type { BaseChildren } from "../node.js"
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

export type parseConstraint<
	node extends { hkt: Hkt },
	parameters extends Parameters<node["hkt"]["f"]>[0]
> = Hkt.apply<node["hkt"], parameters>

export type constraintParser<node extends { hkt: Hkt }> = reify<node["hkt"]>

export const constraintParser = <node extends { hkt: Hkt }>(node: node) =>
	reify(node.hkt) as constraintParser<node>

type CandidateDiscriminantKey<k extends ConstraintKind> = Exclude<
	keyof ConstraintNode<k>["children"],
	keyof BaseChildren
>

export const discriminatingConstraintKeys = {
	domain: "domain",
	proto: "proto",
	unit: "unit"
} as const satisfies {
	[k in BasisKind]: CandidateDiscriminantKey<k>
}

export abstract class BaseConstraint<
	children extends BaseChildren = BaseChildren
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
