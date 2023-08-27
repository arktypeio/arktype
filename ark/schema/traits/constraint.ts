import { compose, trait } from "@arktype/util"
import type { Disjoint } from "../disjoint.js"
import { describable } from "./description.js"
import type { Divisor } from "./divisor.js"

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
	divisor: Divisor
}

export type ConstraintKind = keyof ConstraintDefinitions

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
	ConstraintDefinitions[kind]

export type Rule<kind extends ConstraintKind = ConstraintKind> =
	ConstraintDefinitions[kind]["rule"]

export interface BaseConstraint<self extends BaseConstraint<self, rule>, rule> {
	readonly rule: rule
	intersect(other: self): self | Disjoint | null
}

export const constraint = <kind extends ConstraintKind>(
	intersect: (l: Rule<kind>, r: Rule<kind>) => Rule<kind> | Disjoint | null
) =>
	compose(
		describable,
		trait<[Rule<kind>], BaseConstraint<Constraint<kind>, Rule<kind>>>({
			get rule() {
				return this.args[0]
			},
			intersect(other) {
				const ruleIntersection = intersect(this.rule, other.rule)
				return other
			}
		})
	)

// export type RuleSets = {
// 	prop: PropConstraint
// 	identity: IdentityNode
// 	domain: DomainNode
// 	instanceOf: InstanceOfNode
// 	divisor: Divisor
// 	range: RangeConstraintSet
// 	pattern: readonly PatternConstraint[]
// 	narrow: readonly NarrowNode[]
// 	description: readonly DescriptionNode[]
// 	alias: AliasNode
// 	morph: readonly MorphNode[]
// }

// export type RuleSet<kind extends ConstraintKind = ConstraintKind> =
// 	RuleSets[kind]

// export abstract class RuleNode<
// 	subclass extends RuleSubclass<definitionKey>,
// 	definitionKey extends keyof InstanceType<subclass>
// > extends BaseNode {
// 	apply(to: readonly this[]): readonly this[] | Disjoint {
// 		const result: this[] = []
// 		let includesConstraint = false
// 		for (let i = 0; i < to.length; i++) {
// 			const elementResult = this.reduce(to[i])
// 			if (elementResult === null) {
// 				result.push(to[i])
// 			} else if (elementResult instanceof Disjoint) {
// 				return elementResult
// 			} else if (!includesConstraint) {
// 				result.push(elementResult)
// 				includesConstraint = true
// 			} else if (!result.includes(elementResult)) {
// 				return throwInternalError(
// 					`Unexpectedly encountered multiple distinct intersection results for constraint ${elementResult}`
// 				)
// 			}
// 		}
// 		if (!includesConstraint) {
// 			result.push(this)
// 		}
// 		return result
// 	}

// 	reduce(other: this): this | Disjoint | null {
// 		const ruleComparison = this.equals(other) ? this : this.reduceRules(other)
// 		return ruleComparison instanceof Disjoint || ruleComparison === null
// 			? // TODO: unknown
// 			  ruleComparison
// 			: (new (this.constructor as any)(ruleComparison) as this)
// 	}

// 	protected abstract reduceRules(
// 		other: Rule<this["kind"]>
// 	): definition | Disjoint | null
// }

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
