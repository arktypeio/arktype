import type { Domain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export class DomainConstraint extends ConstraintNode<{
	rule: NonEnumerableDomain
}> {
	readonly kind = "domain"

	hash() {
		return this.rule
	}

	writeDefaultDescription() {
		return domainDescriptions[this.rule]
	}

	reduceWith(other: Constraint) {
		return other.kind === "domain" ? Disjoint.from("domain", this, other) : null
	}
}

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
	bigint: "a bigint",
	boolean: "boolean",
	null: "null",
	number: "a number",
	object: "an object",
	string: "a string",
	symbol: "a symbol",
	undefined: "undefined"
} as const satisfies Record<Domain, string>

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = Exclude<
	Domain,
	"null" | "undefined" | "boolean"
>
