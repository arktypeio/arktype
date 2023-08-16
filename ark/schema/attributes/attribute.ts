export abstract class Attribute<value = unknown> {
	constructor(public value: value) {}

	intersect(other: this) {
		return new (this.constructor as any)(this.intersectValues(other)) as this
	}

	abstract intersectValues(other: this): value
}
