import type { conform, Domain, inferDomain } from "@arktype/util"
import { hasDomain, hasKey, Hkt, isKeyOf } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { type BaseChildren } from "../node.js"
import { BaseConstraint, constraintParser } from "./constraint.js"

export interface DomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseChildren {
	domain: domain
}

export type DomainInput = NonEnumerableDomain | DomainSchema

export class DomainNode<
	// @ts-expect-error (coerce the variance of schema to out since TS gets confused by inferDomain)
	out children extends DomainSchema = DomainSchema
> extends BaseConstraint<children> {
	readonly kind = "domain"

	declare infer: inferDomain<children["domain"]>

	protected constructor(schema: children) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], DomainInput>) => {
			return new DomainNode(
				typeof input === "string" ? { domain: input } : input
			) as {} as typeof input extends DomainSchema
				? DomainNode<typeof input>
				: typeof input extends NonEnumerableDomain
				? DomainNode<{ domain: typeof input }>
				: never
		}
	})()

	static from = constraintParser(this)

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

export const domainNode = DomainNode.from

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

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions
