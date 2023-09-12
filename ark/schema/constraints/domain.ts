import type { conform, Domain, inferDomain } from "@arktype/util"
import { Hkt, reify } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { parser } from "../schema.js"
import type { Constraint, ConstraintSchema } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface DomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends ConstraintSchema {
	rule: domain
}

export class DomainNode<
	// @ts-expect-error
	out schema extends DomainSchema = DomainSchema
> extends ConstraintNode<schema> {
	readonly kind = "domain"

	declare infer: inferDomain<schema["rule"]>

	protected constructor(schema: schema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], NonEnumerableDomain | DomainSchema>) => {
			return new DomainNode(
				typeof input === "string" ? { rule: input } : input
			) as {} as typeof input extends DomainSchema
				? DomainNode<typeof input>
				: typeof input extends NonEnumerableDomain
				? DomainNode<{ rule: typeof input }>
				: never
		}
	})()

	static from = parser(this)

	hash() {
		return this.rule
	}

	writeDefaultDescription() {
		return domainDescriptions[this.rule]
	}

	reduceWith(other: Constraint) {
		return other.kind === "domain" ? Disjoint.from("domain", this, other) : null
	}
}

export const domainNode = DomainNode.from

/** Each domain's completion for the phrase "Must be _____" */
export const domainDescriptions = {
	bigint: "a bigint",
	boolean: "boolean",
	null: "null",
	number: "a number",
	object: "an object",
	string: "a string",
	symbol: "a symbol",
	undefined: "undefined"
} as const satisfies Record<Domain, string>

// only domains with an infinite number of values are allowed as bases
export type NonEnumerableDomain = Exclude<
	Domain,
	"null" | "undefined" | "boolean"
>
