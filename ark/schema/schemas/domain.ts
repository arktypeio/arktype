import {
	type NonEnumerableDomain,
	domainDescriptions,
	domainOf,
	getBaseDomainKeys
} from "@arktype/util"
import type { array } from "../../util/arrays.js"
import type { Key } from "../../util/records.js"
import { implementNode } from "../base.js"
import {
	type PrimitiveAttachments,
	derivePrimitiveAttachments
} from "../main.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { TraverseAllows } from "../shared/traversal.js"
import type { RawSchema, RawSchemaAttachments } from "./schema.js"

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
	attachments: DomainAttachments
}>

export interface DomainAttachments
	extends RawSchemaAttachments<DomainDeclaration>,
		PrimitiveAttachments<DomainDeclaration> {
	readonly literalKeys: array<Key>
}

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
	},
	construct: (self): DomainDeclaration["attachments"] => {
		const literalKeys = getBaseDomainKeys(self.domain)
		const traverseAllows: TraverseAllows = (data) =>
			domainOf(data) === self.domain
		return derivePrimitiveAttachments<DomainDeclaration>(self, {
			traverseAllows,
			expression: self.domain,
			compiledCondition:
				self.domain === "object" ?
					`((typeof data === "object" && data !== null) || typeof data === "function")`
				:	`typeof data === "${self.domain}"`,
			compiledNegation:
				self.domain === "object" ?
					`((typeof data !== "object" || data === null) && typeof data !== "function")`
				:	`typeof data !== "${self.domain}"`,
			literalKeys,
			rawKeyOf: () => self.$.units(literalKeys)
		})
	}
})

export type DomainNode = RawSchema<DomainDeclaration>
