import { intersectUniqueLists } from "@arktype/util"
import { AttributeNode } from "./attribute.js"

export class AliasAttribute extends AttributeNode<readonly string[]> {
	intersectValues(other: AliasAttribute) {
		return intersectUniqueLists(this.value, other.value)
	}

	toString() {
		return this.value.join(" and ")
	}
}
