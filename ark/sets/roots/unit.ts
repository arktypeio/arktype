import {
	$ark,
	Disjoint,
	isResolutionFinal,
	type BaseConstraint,
	type BaseRoot,
	type DomainNode,
	type IntersectionContext,
	type Unit
} from "@ark/schema"
import { ParseError } from "@ark/util"
import {
	defineRightwardIntersections,
	type setImplementationOf
} from "../implement.ts"

const deferUnitIntersection = (
	l: Unit.Node,
	r: BaseRoot,
	ctx: IntersectionContext
): BaseRoot =>
	ctx.$.lazilyResolve(
		() => (r.allowsUnused(l.unit) ? l : $ark.kw.never.internal),
		`${l.id}&${r.id}`,
		"&",
		[l, r]
	)

export const unit: setImplementationOf<Unit.Declaration> = {
	intersections: {
		unit: (l, r) => Disjoint.init("unit", l, r),
		...defineRightwardIntersections("unit", (l, r, ctx) => {
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

			if (!r.is("intersection")) return l

			if (!isResolutionFinal() && r.hasAlias)
				return deferUnitIntersection(l, r, ctx)

			// when not yet final, an opaque predicate (e.g. fromJsonSchema's
			// not/oneOf/if on a recursive $ref) may touch an unresolved alias
			const deferOnError =
				!isResolutionFinal() && Boolean(r.inner.predicate || r.userCode)
			for (const rConstraint of r.children) {
				if (rConstraint === rBasis) continue
				if (deferOnError) {
					try {
						if (rConstraint.allowsUnused(l.unit as never)) continue
					} catch (e) {
						if (e instanceof ParseError) throw e
						return deferUnitIntersection(l, r, ctx)
					}
				} else if (rConstraint.allowsUnused(l.unit as never)) continue
				return Disjoint.init("assignability", l, rConstraint)
			}
			return l
		})
	}
}
