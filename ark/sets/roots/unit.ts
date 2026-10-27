import {
	$ark,
	Disjoint,
	type BaseConstraint,
	type DomainNode,
	type Unit
} from "@ark/schema"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"

export const unit: setImplementationOf<Unit.Declaration> = {
	intersections: {
		unit: (l, r) => Disjoint.init("unit", l, r),
		...defineRightwardIntersections("unit", (l, r) => {
			// a basis pruned by a discriminant leaves constraints that can't check
			// data outside the basis they imply
			const rBasis =
				r.is("intersection") ?
					(r.basis ??
					(r.children as BaseConstraint[]).find(
						rConstraint => rConstraint.implied?.allowsUnused(l.unit) === false
					)?.implied)
				:	r
			if (rBasis && !rBasis.allowsUnused(l.unit)) {
				// we try to use a domain Disjoint if possible since it's better for discrimination
				const rDomain =
					rBasis.is("domain") ? rBasis
					: rBasis.is("proto") ? ($ark.kw.object as DomainNode)
					: null
				if (rDomain && l.domain !== rDomain.domain) {
					const lDomainDisjointValue =
						(
							l.domain === "undefined" ||
							l.domain === "null" ||
							l.domain === "boolean"
						) ?
							l.domain
						:	($ark.kw[l.domain] as DomainNode)
					return Disjoint.init("domain", lDomainDisjointValue, rDomain)
				}
				return Disjoint.init("assignability", l, rBasis)
			}

			if (r.allowsUnused(l.unit)) return l

			return Disjoint.init(
				"assignability",
				l,
				r.is("intersection") ?
					r.children.find(
						rConstraint => !rConstraint.allowsUnused(l.unit as never)
					)!
				:	r
			)
		})
	}
}
