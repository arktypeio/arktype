import type { DescriptionAttribute } from "./description.js"

export abstract class Attribute<value> {
	constructor(public value: value) {}

	intersect(other: this) {
		return new (this.constructor as any)(this.intersectValues(other)) as this
	}

	abstract intersectValues(other: this): value
}

export type AttributeRecord = Record<string, Attribute<unknown>>

export type UniversalAttributes = {
	readonly description?: DescriptionAttribute
	readonly alias?: DescriptionAttribute
}
