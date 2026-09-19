import { Disjoint, type Domain } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const domain: setImplementationOf<Domain.Declaration> =
	implementSets<Domain.Declaration>({
		intersections: {
			domain: (l, r) =>
				// since l === r is handled by default, remaining cases are disjoint
				// outside those including options like numberAllowsNaN
				l.domain === "number" && r.domain === "number" ?
					l.numberAllowsNaN ?
						r
					:	l
				:	Disjoint.init("domain", l, r)
		}
	})
