import type { Predicate } from "@ark/schema"
import { implementSets, type setImplementationOf } from "./implement.ts"

export const predicate: setImplementationOf<Predicate.Declaration> =
	implementSets<Predicate.Declaration>({
		intersections: {
			// as long as the narrows in l and r are individually safe to check
			// in the order they're specified, checking them in the order
			// resulting from this intersection should also be safe.
			predicate: () => null
		}
	})
