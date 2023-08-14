import { throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { NodeDefinition } from "../node.js"
import { BaseNode } from "../node.js"
import type { DivisorNodeDefinition } from "./divisibility.js"
import type { DomainNodeDefinition } from "./domain.js"
import type { IdentityNodeDefinition } from "./identity.js"
import type { InstanceOfNodeDefinition } from "./instanceOf.js"
import type { NarrowNodeDefinition } from "./narrow.js"
import type { RangeNodeDefinition } from "./range.js"
import type { PatternNodeDefinition } from "./regex.js"

export type ConstraintDefinitionsByKind = {
	// identity: IdentityNodeDefinition
	domain: DomainNodeDefinition
	// instanceOf: InstanceOfNodeDefinition
	// divisor: DivisorNodeDefinition
	// range: RangeNodeDefinition
	// pattern: PatternNodeDefinition
	// narrow: NarrowNodeDefinition
}

export type ConstraintKind = keyof ConstraintDefinitionsByKind

export abstract class ConstraintNode<
	kind extends ConstraintKind = ConstraintKind
> extends BaseNode<ConstraintDefinitionsByKind[kind]> {
	apply(to: readonly ConstraintNode[]) {
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

	reduce(other: ConstraintNode) {
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
	): this["rule"] | Disjoint | null
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
