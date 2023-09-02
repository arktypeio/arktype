import type {
	AbstractableConstructor,
	evaluate,
	extend,
	inferDomain
} from "@arktype/util"
import { compose, throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { Fingerprinted, Kinded } from "../node.js"
import type { BoundConstraint } from "./bound.js"
import { Boundable } from "./bound.js"
import { Describable } from "./description.js"
import type { DivisorConstraint } from "./divisor.js"
import { Divisible } from "./divisor.js"
import type { DomainConstraint, NonEnumerableDomain } from "./domain.js"
import type { IdentityConstraint } from "./identity.js"
import type { NarrowConstraint } from "./narrow.js"
import { Narrowable } from "./narrow.js"
import type { PropConstraint } from "./prop.js"
import { Propable } from "./prop.js"
import type { PrototypeConstraint } from "./prototype.js"
import type { RegexConstraint } from "./regex.js"
import { Matchable } from "./regex.js"

export type BasesByKind = {
	domain: DomainConstraint
	identity: IdentityConstraint
	prototype: PrototypeConstraint
}

export type BasisKind = keyof BasesByKind

export type RefinementsByKind = {
	divisor: DivisorConstraint
	bound: BoundConstraint
	regex: RegexConstraint
	prop: PropConstraint
	narrow: NarrowConstraint
}

export type RefinementKind = keyof RefinementsByKind

export const refinementTraits = {
	divisor: Divisible,
	bound: Boundable,
	regex: Matchable,
	prop: Propable,
	narrow: Narrowable
} satisfies Record<RefinementKind, AbstractableConstructor>

export type RefinementTraits = typeof refinementTraits

export type RefinementRules = {
	[k in RefinementKind]: ConstructorParameters<RefinementTraits[k]>[0]
}

export type ConstraintsByKind = extend<BasesByKind, RefinementsByKind>

export type ConstraintKind = keyof ConstraintsByKind

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintsByKind[kind]

export type ConstraintRule<kind extends ConstraintKind = ConstraintKind> =
	Constraint<kind>["rule"]

export type RuleIntersection<rule> = (
	l: rule,
	r: rule
) => readonly rule[] | Disjoint

export const composeConstraint = <rule>(intersect: RuleIntersection<rule>) => {
	return compose<[rule: 1, attributes: 1]>()(
		Describable,
		Kinded,
		Fingerprinted,
		class {
			constructor(public rule: rule) {}

			apply(to: readonly Constraint[]): readonly Constraint[] | Disjoint {
				const result: Constraint[] = []
				let includesConstraint = false
				for (let i = 0; i < to.length; i++) {
					const elementResult = this.reduce(to[i])
					if (elementResult === null) {
						result.push(to[i])
					} else if (elementResult instanceof Disjoint) {
						return elementResult
					} else if (!includesConstraint) {
						result.push(elementResult)
						includesConstraint = true
					} else if (!result.includes(elementResult)) {
						return throwInternalError(
							`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
						)
					}
				}
				if (!includesConstraint) {
					result.push(this as never)
				}
				return result
			}

			reduce(other: Constraint) {
				return this as {} as Constraint
			}
		}
	)
}

export type BaseConstraintParameters<
	rule,
	additionalAttributes = {}
> = readonly [
	rule: rule,
	attributes?: evaluate<
		ConstructorParameters<ReturnType<typeof composeConstraint>>[1] &
			additionalAttributes
	>
]

// export const assertAllowsConstraint = (
// 	basis: Node<BasisKind> | null,
// 	node: Node<RefinementKind>
// ) => {
// 	if (basis?.hasKind("unit")) {
// 		return throwInvalidConstraintError(
// 			node.kind,
// 			"a non-literal type",
// 		)
// 	}
// 	const domain = basis?.domain ?? "unknown"
// 	switch (node.kind) {
// 		case "divisor":
// 			if (domain !== "number") {
// 				throwParseError(writeIndivisibleMessage(domain))
// 			}
// 			return
// 		case "bound":
// 			if (domain !== "string" && domain !== "number") {
// 				const isDateClassBasis =
// 					basis?.hasKind("class") && basis.extendsOneOf(Date)
// 				if (isDateClassBasis) {
// 					if (!isDateLiteral(node.rule.limit)) {
// 						throwParseError(
// 							writeInvalidLimitMessage(
// 								node.rule.comparator,
// 								node.rule.limit,
// 								// TODO: we don't know if this is true, validate range together
// 								"right"
// 							)
// 						)
// 					}
// 					return
// 				}
// 				const hasSizedClassBasis =
// 					basis?.hasKind("class") && basis.extendsOneOf(Array)
// 				if (!hasSizedClassBasis) {
// 					throwParseError(writeUnboundableMessage(domain))
// 				}
// 			}
// 			if (typeof node.rule.limit !== "number") {
// 				throwParseError(
// 					writeInvalidLimitMessage(
// 						node.rule.comparator,
// 						node.rule.limit,
// 						// TODO: we don't know if this is true, validate range together
// 						"right"
// 					)
// 				)
// 			}
// 			return
// 		case "regex":
// 			if (domain !== "string") {
// 				throwInvalidConstraintError("regex", "a string", domain)
// 			}
// 			return
// 		case "props":
// 			if (domain !== "object") {
// 				throwInvalidConstraintError("props", "an object", domain)
// 			}
// 			return
// 		case "narrow":
// 			return
// 		default:
// 			throwInternalError(`Unexpected rule kind '${(node as Node).kind}'`)
// 	}
// }

// export const writeInvalidConstraintMessage = (
// 	kind: RefinementKind,
// 	typeMustBe: string,
// 	typeWas: string
// ) => {
// 	return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
// }

// export const throwInvalidConstraintError = (
// 	...args: Parameters<typeof writeInvalidConstraintMessage>
// ) => throwParseError(writeInvalidConstraintMessage(...args))
