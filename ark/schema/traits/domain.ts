import type { Domain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { type BaseConstraint, constraint } from "./constraint.js"

export interface DomainNode
	extends BaseConstraint<"domain", [NonEnumerableDomain]> {}

export const domain = constraint<DomainNode>((l, r) =>
	Disjoint.from("domain", l, r)
)({
	writeDefaultDescription() {
		return domainDescriptions[this.rule]
	}
})

// export class DomainNode<
// 	domain extends NonEnumerableDomain = NonEnumerableDomain
// > extends RuleNode<DomainDefinition<domain>> {
// 	readonly kind = "domain"

// 	reduceRules(other: DomainNode) {
// 		return other.hasKind("domain") ? Disjoint.from("domain", this, other) : null
// 	}

// 	writeDefaultDescription() {
// 		return domainDescriptions[this.value]
// 	}
// }

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
