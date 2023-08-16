import { throwInternalError } from "@arktype/util"
import type { UniversalAttributes } from "../attributes/attribute.js"
import { Disjoint } from "../disjoint.js"
import { BaseNode } from "../node.js"
import type { DivisorConstraint } from "./divisor.js"
import type { DomainConstraint } from "./domain.js"
import type { IdentityConstraint } from "./identity.js"
import type { InstanceOfConstraint } from "./instanceOf.js"
import type { NarrowConstraint } from "./narrow.js"
import type { PatternConstraint } from "./pattern.js"
import type { PropConstraint } from "./prop/prop.js"
import type { RangeConstraint } from "./range.js"

export type ConstraintsByKind = {
	prop: PropConstraint
	identity: IdentityConstraint
	domain: DomainConstraint
	instanceOf: InstanceOfConstraint
	divisor: DivisorConstraint
	range: RangeConstraint
	pattern: PatternConstraint
	narrow: NarrowConstraint
}

export type ConstraintKind = keyof ConstraintsByKind

export abstract class ConstraintNode<
	definition extends UniversalAttributes = UniversalAttributes
> extends BaseNode<definition> {
	apply(to: readonly ConstraintNode[]): readonly ConstraintNode[] | Disjoint {
		const result: ConstraintNode[] = []
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
			result.push(this)
		}
		return result
	}

	reduce(other: ConstraintNode): Disjoint | ConstraintNode | null {
		return this.reduceOwnKind(other) ?? other.reduceOwnKind(this)
	}

	private reduceOwnKind(other: ConstraintNode) {
		const ruleComparison = this.equals(other)
			? this.rule
			: this.reduceWithRuleOf(other)
		return ruleComparison instanceof Disjoint || ruleComparison === null
			? // TODO: unknown
			  (ruleComparison as Disjoint | null)
			: (new (this.constructor as any)(ruleComparison) as this)
	}

	protected abstract reduceWithRuleOf(
		other: ConstraintNode
	): definition | Disjoint | null
}

// export const assertAllowsConstraint = (
// 	basis: Node<BasisKind> | null,
// 	node: Node<RefinementKind>
// ) => {
// 	if (basis?.hasKind("unit")) {
// 		return throwInvalidConstraintError(
// 			node.kind,
// 			"a non-literal type",gujhnkib.l
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
