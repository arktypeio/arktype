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
				r.hasKind("intersection") ?
					(r.basis ??
					(r.children as BaseConstraint[]).find(
						rConstraint =>
							rConstraint.impliedBasis?.allowsUnused(l.unit) === false
					)?.impliedBasis)
				:	r
			if (rBasis && !rBasis.allowsUnused(l.unit)) {
				// we try to use a domain Disjoint if possible since it's better for discrimination
				const rDomain =
					rBasis.hasKind("domain") ? rBasis
					: rBasis.hasKind("proto") ? ($ark.intrinsic.object as DomainNode)
					: null
				if (rDomain && l.domain !== rDomain.domain) {
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
				return Disjoint.init("assignability", l, rBasis)
			}

			if (r.allowsUnused(l.unit)) return l

			return Disjoint.init(
				"assignability",
				l,
				r.hasKind("intersection") ?
					r.children.find(
						rConstraint => !rConstraint.allowsUnused(l.unit as never)
					)!
				:	r
			)
		})
	}
}
