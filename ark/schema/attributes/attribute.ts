import type { extend } from "@arktype/util"
import type { Intersectable, IntersectableRecord } from "../shared.js"
import type { DescriptionAttribute } from "./description.js"

export abstract class Attribute<value> implements Intersectable {
	constructor(public value: value) {}

	intersect(other: this) {
		return new (this.constructor as any)(this.intersectValues(other)) as this
	}

	abstract intersectValues(other: this): value
}

export type AttributesRecord = extend<IntersectableRecord, UniversalAttributes>

export type UniversalAttributes = {
	readonly description?: DescriptionAttribute
	readonly alias?: {}
}
