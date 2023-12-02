import { domainOf, type Domain } from "@arktype/util"
import { BaseNode } from "../base.js"
import { composeParser } from "../parse.js"
import { In, composePrimitiveTraversal } from "../shared/compilation.js"
import type {
	BaseAttributes,
	declareNode,
	withAttributes
} from "../shared/declare.js"
import type { Disjoint } from "../shared/disjoint.js"
import type { Attachments } from "../shared/nodes.js"
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
}>

export const DomainImplementation = composeParser<DomainDeclaration>({
	kind: "domain",
	collapseKey: "domain",
	keys: {
		domain: {}
	},
	normalize: (input) => (typeof input === "string" ? { domain: input } : input),
	attach: (node) => {
		const traverseAllows = (data: unknown) => domainOf(data) === node.domain
		return {
			basisName: node.domain,
			traverseAllows,
			traverseApply: composePrimitiveTraversal(node, traverseAllows),
			condition:
				node.domain === "object"
					? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
					: `typeof ${In} === "${node.domain}"`,
			negatedCondition:
				node.domain === "object"
					? `((typeof ${In} !== "object" || ${In} === null) && typeof ${In} !== "function")`
					: `typeof ${In} !== "${node.domain}"`
		}
	}
})

export class DomainNode<t = unknown> extends BaseNode<
	t,
	Attachments<"domain">
> {
	writeDefaultDescription() {
		return domainDescriptions[this.domain]
	}
}

// intersections: {
// 	domain: (l, r) => Disjoint.from("domain", l, r)
// },
// compile: compilePrimitive,

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
