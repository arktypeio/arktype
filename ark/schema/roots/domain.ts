import {
	domainDescriptions,
	domainOf,
	getBaseDomainKeys,
	throwParseError,
	type Domain as _Domain,
	type array,
	type Key
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
import {
	writeUnsupportedJsonSchemaTypeMessage,
	type JsonSchema
} from "../shared/jsonSchema.ts"
import type { TraverseAllows } from "../shared/traversal.ts"
import { InternalBasis } from "./basis.ts"

export type Domain = _Domain

export declare namespace Domain {
	export type Enumerable = "undefined" | "null" | "boolean"

	export type NonEnumerable = Exclude<Domain, Enumerable>

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
			actual: data => domainDescriptions[domainOf(data)]
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

	protected innerToJsonSchema(): JsonSchema.Constrainable {
		if (this.domain === "bigint" || this.domain === "symbol")
			return throwParseError(writeUnsupportedJsonSchemaTypeMessage(this.domain))
		return {
			type: this.domain
		}
	}
}

export const Domain = {
	implementation,
	Node: DomainNode
}
