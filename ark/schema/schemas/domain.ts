import {
	domainDescriptions,
	domainOf,
	getBaseDomainKeys,
	type NonEnumerableDomain
} from "@arktype/util"
import { implementNode } from "../base.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseBasis } from "./basis.js"

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

export const domainImplementation = implementNode<DomainDeclaration>({
	kind: "domain",
	hasAssociatedError: true,
	collapsibleKey: "domain",
	keys: {
		domain: {}
	},
	normalize: (def) => (typeof def === "string" ? { domain: def } : def),
	defaults: {
		description: (node) => domainDescriptions[node.domain],
		actual: (data) => (typeof data === "boolean" ? `${data}` : domainOf(data))
	},
	intersections: {
		domain: (l, r) => Disjoint.from("domain", l, r)
	}
})

export class DomainNode<t = any, $ = any> extends BaseBasis<
	t,
	$,
	DomainDeclaration
> {
	static implementation = domainImplementation

	traverseAllows: TraverseAllows = (data) => domainOf(data) === this.domain

	readonly compiledCondition =
		this.domain === "object"
			? `((typeof data === "object" && data !== null) || typeof data === "function")`
			: `typeof data === "${this.domain}"`

	readonly compiledNegation =
		this.domain === "object"
			? `((typeof data !== "object" || data === null) && typeof data !== "function")`
			: `typeof data !== "${this.domain}"`

	readonly errorContext = this.createErrorContext(this.inner)
	readonly expression = this.domain
	readonly literalKeys = getBaseDomainKeys(this.domain)
}
