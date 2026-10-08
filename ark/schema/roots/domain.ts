import {
	domainDescriptions,
	domainOf,
	hasKey,
	throwParseError,
	type Domain as _Domain
} from "@ark/util"
import type {
	BaseErrorContext,
	BaseNormalizedSchema,
	declareNode
} from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { InternalBasis } from "./basis.ts"

export type Domain = _Domain

export declare namespace Domain {
	export type Enumerable = "undefined" | "null" | "boolean"

	export type NonEnumerable = Exclude<Domain, Enumerable>

	export interface Inner<domain extends NonEnumerable = NonEnumerable> {
		readonly domain: domain
		readonly numberAllowsNaN?: boolean
		readonly numberAllowsInfinity?: boolean
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
			numberAllowsNaN: {},
			numberAllowsInfinity: {}
		},
		normalize: schema =>
			typeof schema === "string" ? { domain: schema }
			: hasKey(schema, "numberAllowsNaN") && schema.domain !== "number" ?
				throwParseError(Domain.writeBadAllowNanMessage(schema.domain))
			: hasKey(schema, "numberAllowsInfinity") && schema.domain !== "number" ?
				throwParseError(Domain.writeBadAllowInfinityMessage(schema.domain))
			:	schema,
		applyConfig: (schema, config) => {
			if (schema.domain !== "number") return schema
			if (schema.numberAllowsNaN === undefined && config.numberAllowsNaN)
				schema = { ...schema, numberAllowsNaN: true }
			if (
				schema.numberAllowsInfinity === undefined &&
				config.numberAllowsInfinity
			)
				schema = { ...schema, numberAllowsInfinity: true }
			return schema
		},
		defaults: {
			description: node => domainDescriptions[node.domain],
			actual: data =>
				typeof data === "number" && !Number.isFinite(data) ?
					String(data)
				:	domainDescriptions[domainOf(data)]
		}
	})

export class DomainNode extends InternalBasis<Domain.Declaration> {
	private readonly requiresNaNCheck =
		this.domain === "number" && !this.numberAllowsNaN

	private readonly requiresInfinityCheck =
		this.domain === "number" && !this.numberAllowsInfinity

	readonly traverseAllows: TraverseAllows =
		this.requiresNaNCheck && this.requiresInfinityCheck ?
			data => Number.isFinite(data)
		: this.requiresNaNCheck ?
			data => typeof data === "number" && !Number.isNaN(data)
		: this.requiresInfinityCheck ?
			data =>
				typeof data === "number" &&
				data !== Number.POSITIVE_INFINITY &&
				data !== Number.NEGATIVE_INFINITY
		:	data => domainOf(data) === this.domain

	readonly compiledCondition: string =
		this.domain === "object" ?
			`((typeof data === "object" && data !== null) || typeof data === "function")`
		: this.requiresNaNCheck && this.requiresInfinityCheck ?
			"Number.isFinite(data)"
		:	`typeof data === "${this.domain}"${
				this.requiresNaNCheck ? " && !Number.isNaN(data)"
				: this.requiresInfinityCheck ?
					" && data !== Infinity && data !== -Infinity"
				:	""
			}`

	readonly compiledNegation: string =
		this.domain === "object" ?
			`((typeof data !== "object" || data === null) && typeof data !== "function")`
		: this.requiresNaNCheck && this.requiresInfinityCheck ?
			"!Number.isFinite(data)"
		:	`typeof data !== "${this.domain}"${
				this.requiresNaNCheck ? " || Number.isNaN(data)"
				: this.requiresInfinityCheck ?
					" || data === Infinity || data === -Infinity"
				:	""
			}`

	readonly expression: string =
		this.numberAllowsNaN || this.numberAllowsInfinity ?
			`number${this.numberAllowsNaN ? " | NaN" : ""}${this.numberAllowsInfinity ? " | Infinity | -Infinity" : ""}`
		:	this.domain

	get nestableExpression(): string {
		return this.expression === this.domain ?
				this.expression
			:	`(${this.expression})`
	}

	get defaultShortDescription(): string {
		return domainDescriptions[this.domain]
	}
}

export const Domain = {
	implementation,
	Node: DomainNode,
	writeBadAllowNanMessage: (
		actual: Exclude<Domain.NonEnumerable, "number">
	): string =>
		`numberAllowsNaN may only be specified with domain "number" (was ${actual})`,
	writeBadAllowInfinityMessage: (
		actual: Exclude<Domain.NonEnumerable, "number">
	): string =>
		`numberAllowsInfinity may only be specified with domain "number" (was ${actual})`
}
