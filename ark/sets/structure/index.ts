import { $ark, Disjoint, type Index } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"
import { intersectOrPipeNodes } from "../intersections.ts"

export const index: setImplementationOf<Index.Declaration> =
	implementSets<Index.Declaration>({
		intersections: {
			index: (l, r, ctx) => {
				if (l.signature.equals(r.signature)) {
					const valueIntersection = intersectOrPipeNodes(l.value, r.value, ctx)
					const value =
						valueIntersection instanceof Disjoint ?
							$ark.intrinsic.never.internal
						:	valueIntersection
					return ctx.$.node("index", { signature: l.signature, value })
				}

				// if r constrains all of l's keys to a subtype of l's value, r is a subtype of l
				if (l.signature.extends(r.signature) && l.value.subsumes(r.value))
					return r
				// if l constrains all of r's keys to a subtype of r's value, l is a subtype of r
				if (r.signature.extends(l.signature) && r.value.subsumes(l.value))
					return l

				// other relationships between index signatures can't be generally reduced
				return null
			}
		}
	})
