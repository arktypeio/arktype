import {
	domainDescriptions,
	domainOf,
	throwParseError,
	type Domain as _Domain
} from "@ark/util"
import type { NodeCompiler } from "../shared/compile.ts"
import type { BaseErrorContext, declareNode } from "../shared/declare.ts"
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

	export interface ErrorContext extends BaseErrorContext<"domain">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "domain"
			inner: Inner
			errorCtx: ErrorContext
		}> {}

	export type Node = DomainNode
}

const implementation: nodeImplementationOf<Domain.Declaration> =
	implementNode<Domain.Declaration>({
		kind: "domain",
		ownErr: true,
		bareKey: "domain",
		keys: {
			domain: {},
			numberAllowsNaN: {},
			numberAllowsInfinity: {}
		},
		// an option is false unless set, which it need not be where config agrees,
		// so equal domains share an inner
		applyConfig: (inner, config) => {
			if (inner.domain !== "number") return inner
			const { numberAllowsNaN, numberAllowsInfinity, ...rest } = inner
			const allowsNaN = numberAllowsNaN ?? config.numberAllowsNaN
			const allowsInfinity = numberAllowsInfinity ?? config.numberAllowsInfinity
			return {
				...rest,
				...((allowsNaN || config.numberAllowsNaN) && {
					numberAllowsNaN: allowsNaN
				}),
				...((allowsInfinity || config.numberAllowsInfinity) && {
					numberAllowsInfinity: allowsInfinity
				})
			}
		},
		defaults: {
			description: node => domainDescriptions[node.domain]
		}
	})

export class DomainNode extends InternalBasis<Domain.Declaration> {
	constructor(...args: ConstructorParameters<typeof InternalBasis>) {
		super(...args)
		if (this.domain !== "number") {
			if (this.numberAllowsNaN !== undefined)
				throwParseError(Domain.writeBadAllowNanMessage(this.domain))
			if (this.numberAllowsInfinity !== undefined)
				throwParseError(Domain.writeBadAllowInfinityMessage(this.domain))
		}
	}

	/** whether it rejects NaN, as the number domain does unless `numberAllowsNaN` */
	private readonly checksNaN = this.domain === "number" && !this.numberAllowsNaN

	private readonly checksInfinity =
		this.domain === "number" && !this.numberAllowsInfinity

	readonly traverseAllows: TraverseAllows =
		this.checksNaN && this.checksInfinity ? data => Number.isFinite(data)
		: this.checksNaN ? data => typeof data === "number" && !Number.isNaN(data)
		: this.checksInfinity ?
			data =>
				typeof data === "number" &&
				data !== Number.POSITIVE_INFINITY &&
				data !== Number.NEGATIVE_INFINITY
		:	data => domainOf(data) === this.domain

	compileCondition(js: NodeCompiler, data: string): string {
		return (
			this.domain === "object" ?
				// Apply's check is the one an object's Allows writes, so a bundle
				// holding both compresses it away
				js.trav === "Apply" ?
					`(${data} instanceof Object || Object(${data}) === ${data})`
				:	`${data} !== null && (typeof ${data} === "object" || typeof ${data} === "function")`
			: this.checksNaN && this.checksInfinity ? `Number.isFinite(${data})`
			: `typeof ${data} === "${this.domain}"${
					this.checksNaN ? ` && !Number.isNaN(${data})`
					: this.checksInfinity ?
						` && ${data} !== Infinity && ${data} !== -Infinity`
					:	""
				}`
		)
	}

	readonly expression: string =
		this.numberAllowsNaN || this.numberAllowsInfinity ?
			`number${this.numberAllowsNaN ? " | NaN" : ""}${this.numberAllowsInfinity ? " | Infinity | -Infinity" : ""}`
		:	this.domain

	get nestedExpr(): string {
		return this.expression === this.domain ?
				this.expression
			:	`(${this.expression})`
	}

	get brief(): string {
		return domainDescriptions[this.domain]
	}
}

export const Domain = {
	impl: implementation,
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
