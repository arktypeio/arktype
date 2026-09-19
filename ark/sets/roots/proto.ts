import { $ark, Disjoint, type Domain, type Proto } from "@ark/schema"
import { constructorExtends } from "@ark/util"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const proto: setImplementationOf<Proto.Declaration> =
	implementSets<Proto.Declaration>({
		intersections: {
			proto: (l, r) =>
				l.proto === Date && r.proto === Date ?
					// since l === r is handled by default,
					// exactly one of l or r must have allow invalid dates
					l.dateAllowsInvalid ?
						r
					:	l
				: constructorExtends(l.proto, r.proto) ? l
				: constructorExtends(r.proto, l.proto) ? r
				: Disjoint.init("proto", l, r),
			domain: (proto, domain) =>
				domain.domain === "object" ?
					proto
				:	Disjoint.init(
						"domain",
						$ark.intrinsic.object.internal as Domain.Node,
						domain
					)
		}
	})
