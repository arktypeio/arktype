import {
	domainDescriptions,
	domainOf,
	throwParseError,
	type Domain as _Domain
} from "@ark/util"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import { Disjoint } from "../shared/disjoint.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { JsonSchema } from "../shared/jsonSchema.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { InternalBasis } from "./basis.ts"

export type Domain = _Domain

export declare namespace Domain {
	export type Enumerable = "undefined" | "null" | "boolean"

	export type NonEnumerable = Exclude<Domain, Enumerable>

	export interface Inner<domain extends NonEnumerable = NonEnumerable> {
		readonly domain: domain
		readonly allowNaN?: boolean
	}

	export interface NormalizedSchema<
		domain extends NonEnumerable = NonEnumerable
	> extends BaseNormalizedSchema,
			Inner<domain> {}

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
			domain: {},
			allowNaN: {}
		},
		normalize: schema =>
			typeof schema === "string" ? { domain: schema }
			: schema.allowNaN && schema.domain !== "number" ?
				throwParseError(Domain.writeBadAllowNanMessage(schema.domain))
			:	schema,
		deriveConfigInner: (schema, config) =>
			(
				schema.allowNaN === undefined &&
				schema.domain === "number" &&
				config.numberAllowsNaN
			) ?
				{ allowNaN: true }
			:	undefined,
		defaults: {
			description: node => domainDescriptions[node.domain],
			actual: data =>
				Number.isNaN(data) ? "NaN" : domainDescriptions[domainOf(data)]
		},
		intersections: {
			domain: (l, r) =>
				// since l === r is handled by default, remaining cases are disjoint
				// outside those include options like allowNaN
				l.domain === "number" && r.domain === "number" ?
					l.allowNaN ?
						r
					:	l
				:	Disjoint.init("domain", l, r)
		}
	})

export class DomainNode extends InternalBasis<Domain.Declaration> {
	private readonly requiresNaNCheck = this.domain === "number" && !this.allowNaN

	readonly traverseAllows: TraverseAllows =
		this.requiresNaNCheck ?
			data => typeof data === "number" && !Number.isNaN(data)
		:	data => domainOf(data) === this.domain

	readonly compiledCondition: string =
		this.domain === "object" ?
			`((typeof data === "object" && data !== null) || typeof data === "function")`
		:	`typeof data === "${this.domain}"${this.requiresNaNCheck ? " && !Number.isNaN(data)" : ""}`

	readonly compiledNegation: string =
		this.domain === "object" ?
			`((typeof data !== "object" || data === null) && typeof data !== "function")`
		:	`typeof data !== "${this.domain}"${this.requiresNaNCheck ? " || Number.isNaN(data)" : ""}`

	readonly expression: string = this.allowNaN ? "number | NaN" : this.domain

	get nestableExpression(): string {
		return this.allowNaN ? `(${this.expression})` : this.expression
	}

	get shortDescription(): string {
		return domainDescriptions[this.domain]
	}

	protected innerToJsonSchema(): JsonSchema.Constrainable {
		if (this.domain === "bigint" || this.domain === "symbol")
			return JsonSchema.throwUnjsonifiableError(this.domain)
		return {
			type: this.domain
		}
	}
}

export const Domain = {
	implementation,
	Node: DomainNode,
	writeBadAllowNanMessage: (
		actual: Exclude<Domain.NonEnumerable, "number">
	): string =>
		`allowNaN may only be specified with domain "number" (was ${actual})`
}
