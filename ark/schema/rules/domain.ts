import type { Domain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { RuleNode } from "./rule.js"

export interface DomainRule<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseAttributes {
	readonly value: domain
}

export class DomainConstraint<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends RuleNode<DomainRule<domain>> {
	readonly kind = "domain"

	reduceRules(other: DomainConstraint) {
		return other.hasKind("domain") ? Disjoint.from("domain", this, other) : null
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
