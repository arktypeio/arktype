import { Disjoint, type ExactLength } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const exactLength: setImplementationOf<ExactLength.Declaration> =
	implementSets<ExactLength.Declaration>({
		intersections: {
			exactLength: (l, r, ctx) =>
				Disjoint.init(
					"unit",
					ctx.$.node("unit", { unit: l.rule }),
					ctx.$.node("unit", { unit: r.rule }),
					{ path: ["length"] }
				),
			minLength: (exactLength, minLength) =>
				exactLength.rule >= minLength.rule ?
					exactLength
				:	Disjoint.init("range", exactLength, minLength),
			maxLength: (exactLength, maxLength) =>
				exactLength.rule <= maxLength.rule ?
					exactLength
				:	Disjoint.init("range", exactLength, maxLength)
		}
	})
