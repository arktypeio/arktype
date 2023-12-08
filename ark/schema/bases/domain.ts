import { domainOf, type Domain } from "@arktype/util"
import {
	In,
	compilePrimitive,
	type CompilationContext
} from "../shared/compilation.js"
import type { declareNode, withAttributes } from "../shared/declare.js"
import type { NodeParserImplementation } from "../shared/define.js"
import { Disjoint } from "../shared/disjoint.js"
import type { NodeIntersections } from "../shared/intersect.js"
import { BaseType } from "../type.js"

export type DomainInner<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> = withAttributes<{
	readonly domain: domain
}>

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
	intersections: {
		domain: "domain" | Disjoint
	}
}>

export class DomainNode<t = unknown> extends BaseType<t, DomainDeclaration> {
	static parser: NodeParserImplementation<DomainDeclaration> = {
		collapseKey: "domain",
		keys: {
			domain: {}
		},
		normalize: (input) =>
			typeof input === "string" ? { domain: input } : input
	}

	static intersections: NodeIntersections<DomainDeclaration> = {
		domain: (l, r) => Disjoint.from("domain", l, r)
	}

	basisName = this.domain

	condition =
		this.domain === "object"
			? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
			: `typeof ${In} === "${this.domain}"`

	negatedCondition =
		this.domain === "object"
			? `((typeof ${In} !== "object" || ${In} === null) && typeof ${In} !== "function")`
			: `typeof ${In} !== "${this.domain}"`

	traverseAllows = (data: unknown) => domainOf(data) === this.domain
	traverseApply = this.createPrimitiveTraversal()

	compileBody(ctx: CompilationContext): string {
		return compilePrimitive(this, ctx)
	}

	writeDefaultDescription() {
		return domainDescriptions[this.domain]
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
