import { intersectUniqueLists } from "@arktype/util"
import { AttributeNode } from "./attribute.js"

export class DescriptionAttribute extends AttributeNode<readonly string[]> {
	intersectValues(other: DescriptionAttribute) {
		return intersectUniqueLists(this.value, other.value)
	}

	toString() {
		return this.value.join(" and ")
	}
}
