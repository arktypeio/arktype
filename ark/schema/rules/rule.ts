import type { listable, satisfy } from "@arktype/util"
import { throwInternalError } from "@arktype/util"
import { Disjoint } from "../disjoint.js"
import type { BaseDefinition } from "../node.js"
import { BaseNode } from "../node.js"
import { AliasNode } from "./alias.js"
import type { RangeConstraintSet } from "./bound.js"
import { BoundNode } from "./bound.js"
import { DescriptionNode } from "./description.js"
import { DivisorNode } from "./divisor.js"
import { DomainNode } from "./domain.js"
import { IdentityNode } from "./identity.js"
import { InstanceOfNode } from "./instanceOf.js"
import { MorphNode } from "./morph.js"
import { NarrowNode } from "./narrow.js"
import { PatternConstraint } from "./pattern.js"
import { PropConstraint } from "./prop/prop.js"

export const ruleDefinitions = {
	prop: PropConstraint,
	identity: IdentityNode,
	domain: DomainNode,
	instanceOf: InstanceOfNode,
	divisor: DivisorNode,
	range: BoundNode,
	pattern: PatternConstraint,
	narrow: NarrowNode,
	description: DescriptionNode,
	alias: AliasNode,
	morph: MorphNode
}

export type RuleDefinitions = typeof ruleDefinitions

export type Rule<kind extends RuleKind = RuleKind> = InstanceType<
	RuleDefinitions[kind]
>

export type RuleSets = satisfy<
	{
		[kind in RuleKind]: listable<Rule<kind>>
	},
	{
		prop: PropConstraint
		identity: IdentityNode
		domain: DomainNode
		instanceOf: InstanceOfNode
		divisor: DivisorNode
		range: RangeConstraintSet
		pattern: readonly PatternConstraint[]
		narrow: readonly NarrowNode[]
		description: readonly DescriptionNode[]
		alias: AliasNode
		morph: readonly MorphNode[]
	}
>

export type RuleSet<kind extends RuleKind = RuleKind> = RuleSets[kind]

export type RuleKind = keyof RuleDefinitions

export abstract class RuleNode<
	definition extends BaseDefinition = BaseDefinition
> extends BaseNode<definition> {
	apply(to: readonly this[]): readonly this[] | Disjoint {
		const result: this[] = []
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

	reduce(other: this): this | Disjoint | null {
		const ruleComparison = this.equals(other) ? this : this.reduceRules(other)
		return ruleComparison instanceof Disjoint || ruleComparison === null
			? // TODO: unknown
			  ruleComparison
			: (new (this.constructor as any)(ruleComparison) as this)
	}

	protected abstract reduceRules(
		other: Rule<this["kind"]>
	): definition | Disjoint | null
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
