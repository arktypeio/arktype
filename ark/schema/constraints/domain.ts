import type { conform, Domain, inferDomain } from "@arktype/util"
import { Hkt } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseSchema } from "../schema.js"
import { parser } from "../schema.js"
import type { Constraint } from "./constraint.js"
import { ConstraintNode } from "./constraint.js"

export interface DomainSchema<
	domain extends NonEnumerableDomain = NonEnumerableDomain
> extends BaseSchema {
	domain: domain
}

export type DomainInput = NonEnumerableDomain | DomainSchema

export class DomainNode<
	// @ts-expect-error
	out schema extends DomainSchema = DomainSchema
> extends ConstraintNode<schema> {
	readonly kind = "domain"

	declare infer: inferDomain<schema["domain"]>

	protected constructor(schema: schema) {
		super(schema)
	}

	static hkt = new (class extends Hkt {
		f = (input: conform<this[Hkt.key], DomainInput>) => {
			return new DomainNode(
				typeof input === "string" ? { domain: input } : input
			) as {} as typeof input extends DomainSchema
				? DomainNode<typeof input>
				: typeof input extends NonEnumerableDomain
				? DomainNode<{ domain: typeof input }>
				: never
		}
	})()

	static from = parser(this)

	hash() {
		return this.domain
	}

	writeDefaultDescription() {
		return domainDescriptions[this.domain]
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
