import type { nodeOfKind, RefinementKind } from "@ark/schema"
import { hasKey, nearestFloat, throwInternalError, type array } from "@ark/util"
import { double, integer, type Arbitrary } from "fast-check"
import type { RuleByRefinementKind } from "../arktypeFastCheck.ts"
import type { DomainInputNode } from "./domain.ts"

export const buildNumberArbitrary = (
	node: DomainInputNode
): Arbitrary<number> => {
	if (node.hasKind("domain")) return integer()
	const refinements = getRefinements(node.refinements)
	const hasMax = hasKey(refinements, "max")
	const hasMin = hasKey(refinements, "min")

	if (!hasKey(refinements, "divisor")) return double(refinements)

	const divisor = refinements.divisor
	if (divisor === undefined) throwInternalError("Expected a divisor.")

	if (hasMin && hasMax) {
		if (refinements.min === undefined || refinements.max === undefined) {
			throwInternalError(
				`Expected min and max node refinements to not be undefined. (was min: ${refinements.min} max: ${refinements.max})`
			)
		}
		if (refinements.min > refinements.max) {
			throw new Error(
				`No integer value satisfies >${refinements.min} & <${refinements.max}`
			)
		}
	}

	const min = refinements.min ?? Number.MIN_SAFE_INTEGER
	const max = refinements.max ?? Number.MAX_SAFE_INTEGER

	const firstDivisibleInRange = Math.ceil(min / divisor) * divisor

	if (firstDivisibleInRange > max || firstDivisibleInRange < min) {
		throw new Error(
			`No values within range ${refinements.min} - ${refinements.max} are divisible by ${refinements.divisor}.`
		)
	}

	refinements.min = firstDivisibleInRange
	//fast-check defaults max to 0x7fffffff which prevents larger divisible numbers from being produced
	refinements.max = max

	const integerArbitrary = integer(refinements)

	const integersDivisibleByDivisor = integerArbitrary.map(value => {
		const remainder = value % divisor
		if (remainder === 0) return value

		const lowerPossibleValue = value - remainder
		if (
			lowerPossibleValue >= firstDivisibleInRange &&
			lowerPossibleValue % divisor === 0
		)
			return lowerPossibleValue
		return value + remainder
	})
	return integersDivisibleByDivisor
}

const getRefinements = (refinements: array<nodeOfKind<RefinementKind>>) => {
	const hasDivisor = refinements.find(refinement =>
		refinement.hasKind("divisor")
	)
	const ruleByRefinementKind: RuleByRefinementKind = {}

	for (const refinement of refinements) {
		if (refinement.hasKindIn("min", "max")) {
			let rule = refinement.rule
			if ("exclusive" in refinement) {
				rule = nearestFloat(
					refinement.rule,
					refinement.hasKind("min") ? "+" : "-"
				)
			}
			if (hasDivisor !== undefined)
				rule = refinement.hasKind("min") ? Math.ceil(rule) : Math.floor(rule)
			ruleByRefinementKind[refinement.kind] = rule
		} else if (refinement.hasKind("divisor"))
			ruleByRefinementKind["divisor"] = refinement.rule
	}

	return ruleByRefinementKind
}
