import type { ConstraintDefinition } from "./constraint.js"
import { Constraint, ConstraintSet } from "./constraint.js"

export interface RegexDefinition extends ConstraintDefinition {
	readonly source: string
	readonly flags: string
}

export class RegexConstraint extends Constraint<
	RegexDefinition,
	typeof RegexConstraint
> {
	readonly source = this.definition.source
	readonly flags = this.definition.flags
	readonly literal = toLiteral(this.definition)

	static writeDefaultDescription(def: RegexDefinition) {
		return `matched by ${toLiteral(def)}`
	}

	intersectOwnKeys(other: RegexConstraint) {
		return this.literal === other.literal ? this.definition : null
	}
}

export const RegexSet = ConstraintSet<readonly RegexConstraint[]>

const toLiteral = (def: RegexDefinition) => `/${def.source}/${def.flags}`
