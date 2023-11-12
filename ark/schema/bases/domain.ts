import type { Domain } from "@arktype/util"
import { type declareNode, defineNode, type withAttributes } from "../base.ts"
import { Disjoint } from "../disjoint.ts"
import { In } from "../io/compile.ts"
import { type BasisAttachments } from "./basis.ts"

export type DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = withAttributes<{
	readonly domain: domain
}>

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

export type DomainSchema<
	rule extends NonEnumerableDomain = NonEnumerableDomain
> = DomainInner<rule>

export type DomainDeclaration = declareNode<{
	kind: "domain"
	collapsedSchema: NonEnumerableDomain
	expandedSchema: DomainSchema
	inner: DomainInner
	intersections: {
		domain: "domain" | Disjoint
	}
	attach: BasisAttachments
}>

export const DomainImplementation = defineNode({
	kind: "domain",
	keys: {
		domain: { kind: "leaf" }
	},
	intersections: {
		domain: (l, r) => Disjoint.from("domain", l, r)
	},
	expand: (input) => (typeof input === "string" ? { domain: input } : input),
	writeDefaultDescription: (inner) => domainDescriptions[inner.domain],
	attach: (inner) => ({
		basisName: inner.domain,
		condition:
			inner.domain === "object"
				? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
				: `typeof ${In} === "${inner.domain}"`
	})
})

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
