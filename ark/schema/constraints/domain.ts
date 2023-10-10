import type { Domain, inferDomain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseAttributes } from "../node.js"
import { baseChildrenProps, schema } from "../node.js"
import { BaseConstraint } from "./constraint.js"

export interface DomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseAttributes {
	domain: domain
}

export type DomainInput<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = domain | DomainSchema<domain>

const nonEnumerableDomain = schema(
	{ unit: "bigint" },
	{ unit: "number" },
	{ unit: "object" },
	{ unit: "string" },
	{ unit: "symbol" }
)

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

export class DomainNode<
	// @ts-expect-error (coerce the variance of schema to out since TS gets confused by inferDomain)
	out domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseConstraint<DomainSchema> {
	readonly kind = "domain"

	declare infer: inferDomain<domain>

	constructor(schema: DomainInput<domain>) {
		super(typeof schema === "string" ? { domain: schema } : schema)
	}

	static schema = schema(...nonEnumerableDomain, {
		domain: "object",
		prop: [...baseChildrenProps, { key: "domain", value: nonEnumerableDomain }]
	})

	hash() {
		return this.domain
	}

	writeDefaultDescription() {
		return domainDescriptions[this.domain]
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
