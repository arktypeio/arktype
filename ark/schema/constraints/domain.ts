import type { Domain, inferDomain } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { type BaseAttributes, BaseNode } from "../node.js"
import type { BaseBasis } from "./basis.js"

export interface DomainChildren<
	rule extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseAttributes {
	readonly rule: rule
}

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

export type DomainSchema<
	rule extends NonEnumerableDomain = NonEnumerableDomain
> = rule | DomainChildren<rule>

export class DomainNode<
		// @ts-expect-error (coerce the variance of schema to out since TS gets confused by inferDomain)
		out rule extends NonEnumerableDomain = NonEnumerableDomain
	>
	extends BaseNode<DomainChildren<rule>, typeof DomainNode>
	implements BaseBasis
{
	static readonly kind = "domain"

	declare infer: inferDomain<rule>

	basisName = this.rule

	static keyKinds = this.declareKeys({
		rule: "in"
	})

	static from<rule extends NonEnumerableDomain>(schema: DomainSchema<rule>) {
		return new DomainNode(
			typeof schema === "string" ? { rule: schema } : schema
		)
	}

	static writeDefaultDescription(children: DomainChildren) {
		return domainDescriptions[children.rule]
	}

	static intersections = this.defineIntersections({
		domain: (l, r) => Disjoint.from("domain", l, r)
	})
}

const enumerableDomainDescriptions = {
	boolean: "boolean",
	null: "null",
	undefined: "undefined"
} as const

const nonEnumerableDomainDescriptions = {
	bigint: "a bigint",
	number: "a number",
	object: "an object",
	string: "a string",
	symbol: "a symbol"
} as const

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
	...nonEnumerableDomainDescriptions,
	...enumerableDomainDescriptions
} satisfies Record<Domain, string>
