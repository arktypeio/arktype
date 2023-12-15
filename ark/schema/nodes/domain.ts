import { domainOf, type Domain } from "@arktype/util"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeImplementation } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import { BaseBasis } from "./basis.js"

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
	normalizedSchema: NormalizedDomainSchema
	inner: DomainInner
	intersections: {
		domain: "domain" | Disjoint
	}
}>

export class DomainNode<t = unknown> extends BaseBasis<
	t,
	DomainDeclaration,
	typeof DomainNode
> {
	static implementation: NodeImplementation<DomainDeclaration> = {
		collapseKey: "domain",
		keys: {
			domain: {}
		},
		normalize: (input) =>
			typeof input === "string" ? { domain: input } : input,
		describeExpected(node) {
			return domainDescriptions[node.domain]
		},
		describeActual(data) {
			return domainOf(data)
		},
		intersections: {
			domain: (l, r) => Disjoint.from("domain", l, r)
		}
	}

	basisName = this.domain

	condition =
		this.domain === "object"
			? `((typeof ${this.scope.argName} === "object" && ${this.scope.argName} !== null) || typeof ${this.scope.argName} === "function")`
			: `typeof ${this.scope.argName} === "${this.domain}"`

	negatedCondition =
		this.domain === "object"
			? `((typeof ${this.scope.argName} !== "object" || ${this.scope.argName} === null) && typeof ${this.scope.argName} !== "function")`
			: `typeof ${this.scope.argName} !== "${this.domain}"`

	traverseAllows = (data: unknown) => domainOf(data) === this.domain
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
