import { intersectUniqueLists, throwParseError } from "@arktype/util"
import { Attribute } from "./attribute.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export class MorphAttribute extends Attribute<readonly Morph[]> {
	intersectValues(other: MorphAttribute) {
		return throwParseError("Intersection of morphs")
	}

	toString() {
		return this.value.join(" and ")
	}
}
