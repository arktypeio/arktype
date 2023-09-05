import type { Domain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { composeConstraint } from "./basis.js"

export const domainConstraint = () => {}

export class DomainConstraint extends composeConstraint<NonEnumerableDomain>(
	(l, r) => Disjoint.from("domain", l, r)
) {
	readonly kind = "domain"

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
