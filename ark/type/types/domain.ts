import {
	domainDescriptions,
	domainOf,
	implement,
	type NonEnumerableDomain
} from "@arktype/util"
import { BaseNode } from "../base.js"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import {
	PrimitiveNode,
	type PrimitiveAttachments
} from "../shared/implement.js"

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
	attachments: PrimitiveAttachments<DomainDeclaration>
}>

export class DomainNode<t = any> extends implement(
	BaseNode<DomainDeclaration>,
	PrimitiveNode<DomainDeclaration>,
	{
		construct: (self) => {
			return {
				traverseAllows: (data: unknown) => domainOf(data) === self.domain,
				compiledCondition:
					self.domain === "object"
						? `((typeof ${jsData} === "object" && ${jsData} !== null) || typeof ${jsData} === "function")`
						: `typeof ${jsData} === "${self.domain}"`,
				compiledNegation:
					self.domain === "object"
						? `((typeof ${jsData} !== "object" || ${jsData} === null) && typeof ${jsData} !== "function")`
						: `typeof ${jsData} !== "${self.domain}"`,

				errorContext: self.createErrorContext(self.inner),
				expression: self.domain
			}
		}
	}
) {
	static implementation = this.implement({
		hasAssociatedError: true,
		collapseKey: "domain",
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
				return domainOf(data)
			}
		},
		intersections: {
			domain: (l, r) => Disjoint.from("domain", l, r)
		}
	})
}
