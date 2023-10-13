import type { Domain, inferDomain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { BaseConstraint } from "./constraint.js"

export interface DomainSchema<
	rule extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseAttributes {
	rule: rule
}

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

export class DomainNode<
	// @ts-expect-error (coerce the variance of schema to out since TS gets confused by inferDomain)
	out rule extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseConstraint {
	readonly kind = "domain"

	declare infer: inferDomain<rule>
	readonly rule: rule

	constructor(public schema: DomainSchema<rule>) {
		super(schema)
		this.rule = schema.rule
	}

	hash() {
		return this.rule
	}

	writeDefaultDescription() {
		return domainDescriptions[this.rule]
	}

	intersectSymmetric(other: DomainNode) {
		return Disjoint.from("domain", this, other)
	}

	intersectAsymmetric() {
		return null
	}
}

const enumerableDomainDescriptions = {
	boolean: "boolean",
	null: "null",
	undefined: "undefined"
}

const nonEnumerableDomainDescriptions = {
	bigint: "a bigint",
	number: "a number",
	object: "an object",
	string: "a string",
	symbol: "a symbol"
}

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
	...nonEnumerableDomainDescriptions,
	...enumerableDomainDescriptions
} as const satisfies Record<Domain, string>
