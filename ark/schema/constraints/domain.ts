import type { Domain } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import { ConstraintNode } from "./constraint.js"

export interface DomainRule<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends UniversalAttributes {
	readonly value: domain
}

export class DomainConstraint<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends ConstraintNode<DomainRule<domain>> {
	readonly kind = "domain"

	reduceWithRuleOf(other: DomainConstraint) {
		return Disjoint.from("domain", this, other)
	}

	writeDefaultDescription() {
		return domainDescriptions[this.value]
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
