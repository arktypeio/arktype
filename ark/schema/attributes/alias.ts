import { intersectUniqueLists } from "@arktype/util"
import { Attribute } from "./attribute.js"

export class AliasAttribute extends Attribute<readonly string[]> {
	intersectValues(other: AliasAttribute) {
		return intersectUniqueLists(this.value, other.value)
	}

	toString() {
		return this.value.join(" and ")
	}
}
