import type { mutable } from "@arktype/util"
import { compose, throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import { Fingerprinted, Intersectable, Kinded } from "../node.js"
import type { BoundConstraint } from "./bound.js"
import { Describable } from "./description.js"
import type { DivisorConstraint } from "./divisor.js"
import type { DomainConstraint } from "./domain.js"
import type { Identity } from "./identity.js"
import type { NarrowConstraint } from "./narrow.js"
import type { PropConstraint } from "./prop.js"
import type { PrototypeConstraint } from "./prototype.js"
import type { RegexConstraint } from "./regex.js"

export const ruleDefinitions = {
	// prop: PropConstraint,
	// identity: IdentityNode,
	// domain: DomainNode,
	// instanceOf: InstanceOfNode,
	// divisor: DivisorNode
	// range: BoundNode,
	// pattern: PatternConstraint,
	// narrow: NarrowNode,
	// description: DescriptionNode,
	// alias: AliasNode,
	// morph: MorphNode
}

export type ConstraintDefinitions = {
	divisor: DivisorConstraint
	domain: DomainConstraint
	bound: BoundConstraint
	regex: RegexConstraint
	identity: Identity
	prototype: PrototypeConstraint
	prop: PropConstraint
	narrow: NarrowConstraint
}

export type ConstraintKind = keyof ConstraintDefinitions

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintDefinitions[kind]

// export type Rule<kind extends ConstraintKind = ConstraintKind> =
// 	ConstraintDefinitions[kind]["rule"]

export type RuleIntersection<rule> = (
	l: rule,
	r: rule
) => Disjoint | [] | [rule] | [rule, rule]

export const composeConstraint = <rule>(intersect: RuleIntersection<rule>) =>
	compose<[rule: 1, attributes: 1]>()(
		Describable,
		Kinded,
		Fingerprinted,
		class {
			constructor(public rule: rule) {}

			intersect(other: this) {
				return this
			}
		}
	)

const ConstraintSetBase = compose(Describable, Kinded, Intersectable)

export class ConstraintSet<
	constraints extends readonly Constraint[] = readonly Constraint[]
> {
	constructor(
		public rule: constraints,
		public attributes: ConstructorParameters<typeof ConstraintSetBase>[1]
	) {}

	intersect(other: this) {
		let ruleResult: constraints | Disjoint = this.rule
		for (const constraint of other.rule) {
			ruleResult = addConstraint(this.rule, constraint)
			if (ruleResult instanceof Disjoint) {
				return ruleResult
			}
		}
		// TODO: intersect attributes
		return new ConstraintSet(ruleResult, this.attributes)
	}

	apply(constraint: constraints[number]): this | Disjoint {
		const ruleResult = addConstraint(this.rule, constraint)
		return ruleResult instanceof Disjoint
			? ruleResult
			: (new ConstraintSet(ruleResult, this.attributes) as this)
	}
}

const addConstraint = <constraints extends readonly Constraint[]>(
	base: constraints,
	constraint: constraints[number]
): constraints | Disjoint => {
	const result: mutable<constraints> = [] as never
	let includesConstraint = false
	for (let i = 0; i < base.length; i++) {
		const elementResult = base[i].intersect(constraint as never)
		if (elementResult === null) {
			result.push(base[i])
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
		result.push(constraint)
	}
	return result
}

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
