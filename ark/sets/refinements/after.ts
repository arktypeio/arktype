import type { After } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const after: setImplementationOf<After.Declaration> =
	implementSets<After.Declaration>({
		intersections: {
			after: (l, r) => (l.isStricterThan(r) ? l : r)
		}
	})
