import { domainOf, throwInternalError, type Domain } from "@arktype/util"
import type { UnknownNode } from "../base.js"
import { jsData } from "../shared/compile.js"
import type { BaseMeta, declareNode } from "../shared/declare.js"
import { Disjoint } from "../shared/disjoint.js"
import { BaseBasis } from "./basis.js"

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
	expectedContext: DomainInner
}>

export class DomainNode<t = unknown> extends BaseBasis<
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
		}
	})

	basisName = this.domain

	traverseAllows = (data: unknown) => domainOf(data) === this.domain
	compiledCondition =
		this.domain === "object"
			? `((typeof ${jsData} === "object" && ${jsData} !== null) || typeof ${jsData} === "function")`
			: `typeof ${jsData} === "${this.domain}"`

	compiledNegation =
		this.domain === "object"
			? `((typeof ${jsData} !== "object" || ${jsData} === null) && typeof ${jsData} !== "function")`
			: `typeof ${jsData} !== "${this.domain}"`

	readonly expectedContext = this.createExpectedContext(this.inner)

	protected intersectOwnInner(r: DomainNode) {
		return Disjoint.from("domain", this, r)
	}

	intersectRightwardInner(r: UnknownNode) {
		return throwInternalError(
			`Unexpected attempt to intersect node of kind ${r.kind} from domain.`
		)
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
