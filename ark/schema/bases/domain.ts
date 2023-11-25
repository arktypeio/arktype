import type { Domain } from "@arktype/util"
import { compilePrimitive, In } from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import { defineNode } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { BasisAttachments } from "./basis.js"

export type DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = withAttributes<{
	readonly domain: domain
}>

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

export type DomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = domain | NormalizedDomainSchema<domain>

export type NormalizedDomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = DomainInner<domain>

export type DomainDeclaration = declareNode<{
	kind: "domain"
	schema: DomainSchema
	inner: DomainInner
	intersections: {
		domain: "domain" | Disjoint
	}
	attach: BasisAttachments
}>

export const DomainImplementation = defineNode({
	kind: "domain",
	collapseKey: "domain",
	keys: {
		domain: {}
	},
	intersections: {
		domain: (l, r) => Disjoint.from("domain", l, r)
	},
	normalize: (input) => (typeof input === "string" ? { domain: input } : input),
	writeDefaultDescription: (node) => domainDescriptions[node.domain],
	attach: (node) => ({
		basisName: node.domain,
		condition:
			node.domain === "object"
				? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
				: `typeof ${In} === "${node.domain}"`,
		negatedCondition:
			node.domain === "object"
				? `((typeof ${In} !== "object" || ${In} === null) && typeof ${In} !== "function")`
				: `typeof ${In} !== "${node.domain}"`
	}),
	compile: compilePrimitive
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
