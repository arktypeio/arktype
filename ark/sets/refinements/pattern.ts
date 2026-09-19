import type { Pattern } from "@ark/schema"
import { implementSets, type setImplementationOf } from "../implement.ts"

export const pattern: setImplementationOf<Pattern.Declaration> =
	implementSets<Pattern.Declaration>({
		intersections: {
			// for now, non-equal regex are naively intersected:
			// https://github.com/arktypeio/arktype/issues/853
			pattern: () => null
		}
	})
