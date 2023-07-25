import type { ConstraintDefinition } from "./constraint.js"
import { Constraint, ConstraintSet } from "./constraint.js"

export interface RegexDefinition extends ConstraintDefinition {
	readonly source: string
	readonly flags: string
}

export class RegexConstraint implements Constraint {
	constructor(public definition: RegexDefinition) {}

	readonly source = this.definition.source
	readonly flags = this.definition.flags
	readonly literal = `/${this.source}/${this.flags}`
	readonly description =
		this.definition.description ?? `matched by ${this.literal}`

	intersectOwnKeys(other: RegexConstraint) {
		return this.literal === other.literal ? this : null
	}
}
