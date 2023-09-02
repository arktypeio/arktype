import type { Domain, domainOf, inferDomain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseConstraintParameters } from "./constraint.js"
import { composeConstraint } from "./constraint.js"
import type { NarrowConstraint } from "./narrow.js"

export class DomainConstraint<
	rule extends NonEnumerableDomain = NonEnumerableDomain
> extends composeConstraint<NonEnumerableDomain>((l, r) =>
	Disjoint.from("domain", l, r)
) {
	readonly kind = "domain"
	declare rule: rule
	declare infer: inferDomain<rule>

	constructor(...args: BaseConstraintParameters<rule>) {
		super(...args)
	}

	hash() {
		return this.rule
	}

	writeDefaultDescription() {
		return domainDescriptions[this.rule]
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
