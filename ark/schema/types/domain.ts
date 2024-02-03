import { domainOf, type Domain } from "@arktype/util"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import type { PrimitiveAttachmentsInput } from "../shared/implement.js"
import { BaseType, type BaseBasis } from "./type.js"

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
	composition: "primitive"
	disjoinable: true
	attachments: PrimitiveAttachmentsInput
}>

export class DomainNode<t = unknown>
	extends BaseType<t, DomainDeclaration, typeof DomainNode>
	implements BaseBasis
{
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
		attachments: (base) => ({
			primitive: true,
			compiledCondition:
				base.domain === "object"
					? `((typeof ${base.$.dataArg} === "object" && ${base.$.dataArg} !== null) || typeof ${base.$.dataArg} === "function")`
					: `typeof ${base.$.dataArg} === "${base.domain}"`,
			compiledNegation:
				base.domain === "object"
					? `((typeof ${base.$.dataArg} !== "object" || ${base.$.dataArg} === null) && typeof ${base.$.dataArg} !== "function")`
					: `typeof ${base.$.dataArg} !== "${base.domain}"`
		})
	})

	readonly constraintGroup = "basis"
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
