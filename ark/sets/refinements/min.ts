import type { Min } from "@ark/schema"
import type { setImplementationOf } from "../implement.ts"

export const min: setImplementationOf<Min.Declaration> = {
	intersections: {
		min: (l, r) => (l.isStricterThan(r) ? l : r)
	}
}
