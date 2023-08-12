import type { Domain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { BaseNode } from "../type.js"

export class DomainConstraint extends BaseNode<{
	rule: NonEnumerableDomain
	attributes: {}
	disjoinable: true
}> {
	readonly kind = "domain"

	readonly domain = this.rule

	intersectRules(other: DomainConstraint) {
		return Disjoint.from("domain", this, other)
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
