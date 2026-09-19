import type { After } from "@ark/schema"
import type { setImplementationOf } from "../implement.ts"

export const after: setImplementationOf<After.Declaration> = {
	intersections: {
		after: (l, r) => (l.isStricterThan(r) ? l : r)
	}
}
