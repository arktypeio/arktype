import { RawNode } from "../node.js"
import { intersectNodes } from "../shared/intersections.js"
import { arkKind } from "../shared/utils.js"
import type {
	BaseConstraintDeclaration,
	intersectConstraintKinds
} from "./util.js"

export class RawConstraint<
	/** @ts-expect-error allow instantiation assignment to the base type */
	out d extends BaseConstraintDeclaration = BaseConstraintDeclaration
> extends RawNode<d> {
	readonly [arkKind] = "constraint"

	intersect<r extends RawConstraint>(
		r: r
	): intersectConstraintKinds<d["kind"], r["kind"]> {
		return intersectNodes(this, r, { $: this.$, piped: false }) as never
	}
}
