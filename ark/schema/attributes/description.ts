import { intersectUniqueLists } from "@arktype/util"
import { Attribute } from "./attribute.js"

export class DescriptionAttribute extends Attribute<readonly string[]> {
	intersectValues(other: DescriptionAttribute) {
		return intersectUniqueLists(this.value, other.value)
	}

	toString() {
		return this.value.join(" and ")
	}
}
