import { $ark, type IntersectionNode, type MinLength } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const minLength: setImplementationOf<MinLength.Declaration> =
	implementSets<MinLength.Declaration>({
		reduce: inner =>
			inner.rule === 0 ?
				// a minimum length of zero is trivially satisfied
				($ark.intrinsic.unknown as IntersectionNode)
			:	undefined,
		intersections: {
			minLength: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})
