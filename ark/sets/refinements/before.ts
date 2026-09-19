import { Disjoint, type Before } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const before: setImplementationOf<Before.Declaration> =
	implementSets<Before.Declaration>({
		intersections: {
			before: (l, r) => (l.isStricterThan(r) ? l : r),
			after: (before, after, ctx) =>
				before.overlapsRange(after) ?
					before.overlapIsUnit(after) ?
						ctx.$.node("unit", { unit: before.rule })
					:	null
				:	Disjoint.init("range", before, after)
		}
	})
