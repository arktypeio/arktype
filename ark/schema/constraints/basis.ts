import type { AbstractableConstructor, Domain, evaluate } from "@arktype/util"
import {
	constructorExtends,
	getExactBuiltinConstructorName,
	objectKindDescriptions
} from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { orthogonal, TypeNode } from "../type.js"

type BasisRulesByKind = {
	domain: NonEnumerableDomain
	constructor: AbstractableConstructor
}

export type BasisKind = evaluate<keyof BasisRulesByKind>

export type BasisRule<kind extends BasisKind = BasisKind> =
	BasisRulesByKind[kind]

export class BasisConstraint extends TypeNode<BasisRule> {
	readonly kind = "basis"
	readonly basisKind: BasisKind =
		typeof this.rule === "string" ? "domain" : "constructor"

	readonly domain: NonEnumerableDomain =
		this.basisKind === "domain" ? (this.rule as NonEnumerableDomain) : "object"

	intersectRules(other: TypeNode) {
		if (!other.hasKind("basis")) {
			return orthogonal
		}
		if (this.rule === other.rule) {
			return this.rule
		}
		if (typeof this.rule === "function") {
			if (other.rule === "object") {
				return this.rule
			}
			if (typeof other.rule === "function") {
				return constructorExtends(this.rule, other.rule)
					? this.rule
					: constructorExtends(other.rule, this.rule)
					? other.rule
					: Disjoint.from("class", this, other)
			}
		}
		if (typeof other.rule === "function") {
			if (this.rule === "object") {
				return other.rule
			}
		}
		return Disjoint.from("domain", this, other)
	}

	writeDefaultDescription() {
		if (typeof this.rule === "string") {
			return domainDescriptions[this.rule]
		}
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule.name}`
	}
}

// hasBasisKind<kind extends BasisKind>(
// 	kind: kind
// ): this is BasisConstraint<kind> {
// 	return this.basisKind === (kind as never)
// }

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

// readonly literalKeys = prototypeKeysOf(this.rule.prototype)

// compile() {
// 	return `${In} instanceof ${
// 		getExactBuiltinConstructorName(this.rule) ??
// 		registry().register(this.rule)
// 	}`
// }

// extendsOneOf(...baseConstructors: AbstractableConstructor[]) {
// 	return baseConstructors.some((ctor) => constructorExtends(this.rule, ctor))
// }
