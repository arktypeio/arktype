import { $ark, Disjoint, type DomainNode, type Unit } from "@ark/schema"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"

export const unit: setImplementationOf<Unit.Declaration> = {
	intersections: {
		unit: (l, r) => Disjoint.init("unit", l, r),
		...defineRightwardIntersections("unit", (l, r) => {
			if (r.allows(l.unit)) return l

			// will always be a disjoint at this point, but we try to use
			// a domain Disjoint if possible since it's better for discrimination

			const rBasis = r.hasKind("intersection") ? r.basis : r
			if (rBasis) {
				const rDomain =
					rBasis.hasKind("domain") ? rBasis : (
						($ark.intrinsic.object as DomainNode)
					)
				if (l.domain !== rDomain.domain) {
					const lDomainDisjointValue =
						(
							l.domain === "undefined" ||
							l.domain === "null" ||
							l.domain === "boolean"
						) ?
							l.domain
						:	($ark.intrinsic[l.domain] as DomainNode)
					return Disjoint.init("domain", lDomainDisjointValue, rDomain)
				}
			}

			return Disjoint.init(
				"assignability",
				l,
				r.hasKind("intersection") ?
					r.children.find(rConstraint => !rConstraint.allows(l.unit as never))!
				:	r
			)
		})
	}
}
