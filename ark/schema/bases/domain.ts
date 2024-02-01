import { domainOf, type Domain } from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { BaseType } from "../type.js"

export interface DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseMeta {
	readonly domain: domain
}

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
	normalizedSchema: NormalizedDomainSchema
	inner: DomainInner
	disjoinable: true
	primitive: true
}>

export class DomainNode<t = unknown> extends BaseType<
	t,
	DomainDeclaration,
	typeof DomainNode
> {
	static implementation = this.implement({
		hasAssociatedError: true,
		collapseKey: "domain",
		keys: {
			domain: {}
		},
		normalize: (input) =>
			typeof input === "string" ? { domain: input } : input,
		defaults: {
			description(inner) {
				return domainDescriptions[inner.domain]
			},
			actual(data) {
				return domainOf(data)
			}
		},
		primitive: (node) => ({
			compiledCondition:
				node.domain === "object"
					? `((typeof ${node.$.dataArg} === "object" && ${node.$.dataArg} !== null) || typeof ${node.$.dataArg} === "function")`
					: `typeof ${node.$.dataArg} === "${node.domain}"`,
			compiledNegation:
				node.domain === "object"
					? `((typeof ${node.$.dataArg} !== "object" || ${node.$.dataArg} === null) && typeof ${node.$.dataArg} !== "function")`
					: `typeof ${node.$.dataArg} !== "${node.domain}"`
		})
	})

	basisName = this.domain

	traverseAllows = (data: unknown) => domainOf(data) === this.domain

	protected intersectOwnInner(r: DomainNode) {
		return Disjoint.from("domain", this, r)
	}
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
