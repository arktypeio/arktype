import { intersectUniqueLists } from "@arktype/util"

export class Description {
	intersect(other: Description) {
		return {
			parts: intersectUniqueLists(this.parts, other.parts)
		}
	}
}
