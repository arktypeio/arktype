import type { Domain, inferDomain } from "@arktype/util"
import { type declareNode, type withAttributes } from "../base.js"
import { Disjoint } from "../disjoint.js"
import { RootNode } from "../root.js"
import type { BaseBasis } from "./basis.js"

export type DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = withAttributes<{
	readonly domain: domain
}>

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = keyof typeof nonEnumerableDomainDescriptions

export type DomainSchema<
	rule extends NonEnumerableDomain = NonEnumerableDomain
> = rule | DomainInner<rule>

export type DomainDeclaration = declareNode<
	"domain",
	{
		schema: DomainSchema
		inner: DomainInner
		intersections: {
			domain: "domain" | Disjoint
		}
	},
	typeof DomainNode
>

export class DomainNode<t = unknown>
	extends RootNode<DomainDeclaration, t>
	implements BaseBasis
{
	static readonly kind = "domain"
	static readonly declaration: DomainDeclaration

	static {
		this.classesByKind.domain = this
	}

	static readonly definition = this.define({
		kind: "domain",
		keys: {
			domain: "in"
		},
		intersections: {
			domain: (l, r) => Disjoint.from("domain", l, r)
		},
		parse: (schema) =>
			typeof schema === "string" ? { domain: schema } : schema,
		compileCondition: (inner) =>
			inner.domain === "object"
				? `((typeof ${this.argName} === "object" && ${this.argName} !== null) || typeof ${this.argName} === "function")`
				: `typeof ${this.argName} === "${inner.domain}"`,
		writeDefaultDescription: (inner) => domainDescriptions[inner.domain]
	})

	readonly basisName = this.domain
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
