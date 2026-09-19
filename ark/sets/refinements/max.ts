import { Disjoint, type Max } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const max: setImplementationOf<Max.Declaration> =
	implementSets<Max.Declaration>({
		intersections: {
			max: (l, r) => (l.isStricterThan(r) ? l : r),
			min: (max, min, ctx) =>
				max.overlapsRange(min) ?
					max.overlapIsUnit(min) ?
						ctx.$.node("unit", { unit: max.rule })
					:	null
				:	Disjoint.init("range", max, min)
		}
	})
