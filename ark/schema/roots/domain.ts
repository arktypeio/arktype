import {
	type NonEnumerableDomain,
	domainDescriptions,
	domainOf,
	getBaseDomainKeys
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { implementNode } from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { RawBasis } from "./basis.js"

export interface DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseMeta {
	readonly domain: domain
}

export type DomainDef<
	// only domains with an infinite number of values are allowed as bases
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = domain | NormalizedDomainDef<domain>

export type NormalizedDomainDef<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = DomainInner<domain>

export type DomainDeclaration = declareNode<{
	kind: "domain"
	def: DomainDef
	normalizedDef: NormalizedDomainDef
	inner: DomainInner
	errorContext: DomainInner
}>

export class DomainNode extends RawBasis<DomainDeclaration> {
	traverseAllows: TraverseAllows = data => domainOf(data) === this.domain

	readonly compiledCondition =
		this.domain === "object" ?
			`((typeof data === "object" && data !== null) || typeof data === "function")`
		:	`typeof data === "${this.domain}"`

	readonly compiledNegation =
		this.domain === "object" ?
			`((typeof data !== "object" || data === null) && typeof data !== "function")`
		:	`typeof data !== "${this.domain}"`

	readonly expression = this.domain
	readonly literalKeys = getBaseDomainKeys(this.domain)
}

export const domainImplementation = implementNode<DomainDeclaration>({
	kind: "domain",
	hasAssociatedError: true,
	collapsibleKey: "domain",
	keys: {
		domain: {}
	},
	normalize: def => (typeof def === "string" ? { domain: def } : def),
	defaults: {
		description: node => domainDescriptions[node.domain],
		actual: data => (typeof data === "boolean" ? `${data}` : domainOf(data))
	},
	intersections: {
		domain: (l, r) => Disjoint.from("domain", l, r)
	}
})
