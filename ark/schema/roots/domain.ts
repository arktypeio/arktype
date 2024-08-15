import {
	domainDescriptions,
	domainOf,
	getBaseDomainKeys,
	type Domain as _Domain,
	type array,
	type Key
} from "@ark/util"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.js"
import type { TraverseAllows } from "../shared/traversal.js"
import { InternalBasis } from "./basis.js"

export type Domain = _Domain

export declare namespace Domain {
	export type NonEnumerable = Exclude<Domain, "undefined" | "null" | "boolean">

	export interface Inner<domain extends NonEnumerable = NonEnumerable> {
		readonly domain: domain
	}

	export interface NormalizedSchema<
		domain extends NonEnumerable = NonEnumerable
	> extends BaseNormalizedSchema {
		readonly domain: domain
	}

	export type Schema<
		// only domains with an infinite number of values are allowed as bases
		domain extends NonEnumerable = NonEnumerable
	> = domain | NormalizedSchema<domain>

	export interface ErrorContext extends BaseErrorContext<"domain">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "domain"
			schema: Schema
			normalizedSchema: NormalizedSchema
			inner: Inner
			errorContext: ErrorContext
		}> {}

	export type Node = DomainNode
}

const implementation: nodeImplementationOf<Domain.Declaration> =
	implementNode<Domain.Declaration>({
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
			domain: (l, r) => Disjoint.init("domain", l, r)
		}
	})

export class DomainNode extends InternalBasis<Domain.Declaration> {
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

export const Domain = {
	implementation,
	Node: DomainNode
}
