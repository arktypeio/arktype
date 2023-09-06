import type { Domain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface DomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends ConstraintSchema {
	rule: domain
}

export class DomainNode<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends ConstraintNode<DomainSchema<domain>, typeof DomainNode> {
	readonly kind = "domain"

	static parse(input: NonEnumerableDomain | DomainSchema) {
		return typeof input === "string" ? { rule: input } : input
	}

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
