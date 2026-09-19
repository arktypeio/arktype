import { Disjoint, type MaxLength } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const maxLength: setImplementationOf<MaxLength.Declaration> =
	implementSets<MaxLength.Declaration>({
		reduce: (inner, $) =>
			inner.rule === 0 ? $.node("exactLength", inner) : undefined,
		intersections: {
			maxLength: (l, r) => (l.isStricterThan(r) ? l : r),
			minLength: (max, min, ctx) =>
				max.overlapsRange(min) ?
					max.overlapIsUnit(min) ?
						ctx.$.node("exactLength", { rule: max.rule })
					:	null
				:	Disjoint.init("range", max, min)
		}
	})
