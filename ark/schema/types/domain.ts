import {
	domainDescriptions,
	domainOf,
	getBaseDomainKeys,
	type NonEnumerableDomain
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { BaseBasis } from "./basis.js"

export interface DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseMeta {
	readonly domain: domain
}

export type DomainSchema<
	// only domains with an infinite number of values are allowed as bases
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
	errorContext: DomainInner
}>

export class DomainNode<t = any> extends BaseBasis<t, DomainDeclaration> {
	static implementation = this.implement({
		kind: "domain",
		hasAssociatedError: true,
		collapsibleKey: "domain",
		keys: {
			domain: {}
		},
		normalize: (input) =>
			typeof input === "string" ? { domain: input } : input,
		defaults: {
			description(node) {
				return domainDescriptions[node.domain]
			},
			actual(data) {
				// don't treat boolean as a domain since it is union of units
				// and are error messages are more consistent if they're described
				// that way universally
				return typeof data === "boolean" ? `${data}` : domainOf(data)
			}
		},
		intersections: {
			domain: (l, r) => Disjoint.from("domain", l, r)
		}
	})

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
