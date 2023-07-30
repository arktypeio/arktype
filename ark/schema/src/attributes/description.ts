import { intersectUniqueLists } from "@arktype/util"

export class DescriptionNode {
	intersect(other: DescriptionNode) {
		return {
			parts: intersectUniqueLists(this.parts, other.parts)
		}
	}
}
