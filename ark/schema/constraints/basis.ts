import type { AbstractableConstructor, Domain, extend } from "@arktype/util"
import { cached, constructorExtends, throwInternalError } from "@arktype/util"
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { Constraint } from "./constraint.js"

export type BasisNodeConfig = NodeConfig & { intersection: Node<BasisKind> }

export class BasisConstraint<
	config extends BasisNodeConfig
> extends Constraint<config> {
	abstract kind: BasisKind
	abstract domain: Domain
	abstract literalKeys: PropertyKey[]

	keyof = cached(() => node.unit(...this.literalKeys))

	intersect(
		this: Node<BasisKind>,
		other: Node<BasisKind>
	): Node<BasisKind> | Disjoint {
		if (this.hasKind("class") && other.hasKind("class")) {
			return constructorExtends(this.rule, other.rule)
				? this
				: constructorExtends(other.rule, this.rule)
				? other
				: Disjoint.from("class", this, other)
		}
		const disjointEntries: DisjointKindEntries = []
		if (this.domain !== other.domain) {
			disjointEntries.push(["domain", { l: this, r: other }])
		}
		if (this.hasKind("unit") && other.hasKind("unit")) {
			if (this.rule !== other.rule) {
				disjointEntries.push(["unit", { l: this, r: other }])
			}
		}
		return disjointEntries.length
			? Disjoint.fromEntries(disjointEntries)
			: basisPrecedenceByKind[this.kind] < basisPrecedenceByKind[other.kind]
			? this
			: basisPrecedenceByKind[other.kind] < basisPrecedenceByKind[this.kind]
			? other
			: throwInternalError(
					`Unexpected non-disjoint intersection from basis nodes with equal precedence ${this} and ${other}`
			  )
	}
}

export type BasisKind = satisfy<NodeKind, "domain" | "class" | "unit">

export type BasisInput =
	| Domain
	| AbstractableConstructor
	| readonly ["===", unknown]

export const basisPrecedenceByKind: Record<BasisKind, number> = {
	unit: 0,
	class: 1,
	domain: 2
}

export type NonEnumerableDomain = Exclude<
	Domain,
	"null" | "undefined" | "boolean"
>

export class DomainNode extends BasisNodeBase<{
	rule: NonEnumerableDomain
	intersection: Node<BasisKind>
	meta: {}
}> {
	readonly kind = "domain"
	readonly literalKeys = getBaseDomainKeys(this.rule)
	readonly domain = this.rule

	compile() {
		return this.rule === "object"
			? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
			: `typeof ${In} === "${this.rule}"`
	}

	describe() {
		return domainDescriptions[this.rule]
	}
}

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

export type UnitNodeMeta = {
	parsedFrom?: DateLiteral
}

export class UnitNode extends BasisNodeBase<{
	rule: unknown
	intersection: Node<BasisKind>
	meta: UnitNodeMeta
}> {
	readonly kind = "unit"
	readonly literalKeys =
		this.rule === null || this.rule === undefined
			? []
			: [...prototypeKeysOf(this.rule), ...Object.keys(this.rule)]
	readonly serialized = compileSerializedValue(this.rule)
	readonly domain = domainOf(this.rule)

	compile() {
		return this.rule instanceof Date
			? `${In}.valueOf() === ${this.rule.valueOf()}`
			: `${In} === ${this.serialized}`
	}

	describe() {
		return this.meta.parsedFrom
			? extractDateLiteralSource(this.meta.parsedFrom)
			: stringify(this.rule)
	}
}

export class ConstructorConstraint extends Constraint<AbstractableConstructor> {
	writeDefaultDescription() {
		const possibleObjectKind = getExactBuiltinConstructorName(this.rule)
		return possibleObjectKind
			? objectKindDescriptions[possibleObjectKind]
			: `an instance of ${this.rule.name}`
	}

	intersectRules(other: ConstructorConstraint) {
		return constructorExtends(this.rule, other.rule)
			? this.rule
			: constructorExtends(other.rule, this.rule)
			? other.rule
			: Disjoint.from("class", this, other)
	}
}

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
