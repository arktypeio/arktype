import type { Min } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const min: setImplementationOf<Min.Declaration> =
	implementSets<Min.Declaration>({
		intersections: {
			min: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})
