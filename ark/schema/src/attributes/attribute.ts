export abstract class Attribute<value> {
	constructor(public value: value) {}

	intersect(other: this) {
		return new (this.constructor as any)(this.intersectValues(other)) as this
	}

	abstract intersectValues(other: this): value
}

export type AttributesRecord = {
	readonly [k: string]: Attribute<unknown>
}
