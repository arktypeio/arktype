import {
	domainDescriptions,
	domainOf,
	getBaseDomainKeys,
	type Key,
	type NonEnumerableDomain,
	type array
} from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { RawBasis } from "./basis.js"

export interface DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseMeta {
	readonly domain: domain
}

export type DomainSchema<
	// only domains with an infinite number of values are allowed as bases
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = domain | DomainInner<domain>

export interface DomainDeclaration
	extends declareNode<{
		kind: "domain"
		schema: DomainSchema
		normalizedSchema: DomainInner
		inner: DomainInner
		errorContext: DomainInner
	}> {}

export class DomainNode extends RawBasis<DomainDeclaration> {
	traverseAllows: TraverseAllows = data => domainOf(data) === this.domain

	readonly compiledCondition: string =
		this.domain === "object" ?
			`((typeof data === "object" && data !== null) || typeof data === "function")`
		:	`typeof data === "${this.domain}"`

	readonly compiledNegation: string =
		this.domain === "object" ?
			`((typeof data !== "object" || data === null) && typeof data !== "function")`
		:	`typeof data !== "${this.domain}"`

	readonly expression: string = this.domain
	readonly literalKeys: array<Key> = getBaseDomainKeys(this.domain)

	get shortDescription(): string {
		return domainDescriptions[this.domain]
	}
}

export const domainImplementation: nodeImplementationOf<DomainDeclaration> =
	implementNode<DomainDeclaration>({
		kind: "domain",
		hasAssociatedError: true,
		collapsibleKey: "domain",
		keys: {
			domain: {}
		},
		normalize: schema =>
			typeof schema === "string" ? { domain: schema } : schema,
		defaults: {
			description: node => domainDescriptions[node.domain],
			actual: data => (typeof data === "boolean" ? `${data}` : domainOf(data))
		},
		intersections: {
			domain: (l, r) => Disjoint.from("domain", l, r)
		}
	})
