import { Disjoint, type Domain } from "@ark/schema"
import type { setImplementationOf } from "../implement.ts"

export const domain: setImplementationOf<Domain.Declaration> = {
	intersections: {
		domain: (l, r, ctx) =>
			// since l === r is handled by default, remaining cases are disjoint
			// outside those including options like numberAllowsNaN, where
			// the result allows a non-finite value only if both sides do
			l.domain !== "number" || r.domain !== "number" ?
				Disjoint.init("domain", l, r)
			: isNumberSubdomainOf(l, r) ? l
			: isNumberSubdomainOf(r, l) ? r
			: ctx.$.node("domain", {
					domain: "number",
					numberAllowsNaN: false,
					numberAllowsInfinity: false
				})
	}
}

const isNumberSubdomainOf = (l: Domain.Node, r: Domain.Node): boolean =>
	(r.numberAllowsNaN || !l.numberAllowsNaN) &&
	(r.numberAllowsInfinity || !l.numberAllowsInfinity)
