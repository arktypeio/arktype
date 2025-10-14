import type { IntersectionNode } from "@ark/schema"
import { hasKey, nearestFloat, throwInternalError } from "@ark/util"
import * as fc from "fast-check"
import type { DomainInputNode } from "./domain.ts"

export const buildNumberArbitrary = (
	node: DomainInputNode
): fc.Arbitrary<number> => {
	if (node.hasKind("domain")) {
		return fc.double({
			noNaN: !node.numberAllowsNaN
		})
	}
	const numberConstraints = getFastCheckNumberConstraints(node)
	const hasMax = hasKey(numberConstraints, "max")
	const hasMin = hasKey(numberConstraints, "min")

	if (!hasKey(numberConstraints, "divisor")) return fc.double(numberConstraints)

	const divisor = numberConstraints.divisor
	if (divisor === undefined) throwInternalError("Expected a divisor.")

	if (hasMin && hasMax) {
		if (
			numberConstraints.min === undefined ||
			numberConstraints.max === undefined
		) {
			throwInternalError(
				`Expected min and max node refinements to not be undefined. (was min: ${numberConstraints.min} max: ${numberConstraints.max})`
			)
		}
		if (numberConstraints.min > numberConstraints.max) {
			throw new Error(
				`No integer value satisfies >${numberConstraints.min} & <${numberConstraints.max}`
			)
		}
	}

	const min = numberConstraints.min ?? Number.MIN_SAFE_INTEGER
	const max = numberConstraints.max ?? Number.MAX_SAFE_INTEGER

	const firstDivisibleInRange = Math.ceil(min / divisor) * divisor

	if (firstDivisibleInRange > max || firstDivisibleInRange < min) {
		throw new Error(
			`No values within range ${numberConstraints.min} - ${numberConstraints.max} are divisible by ${numberConstraints.divisor}.`
		)
	}

	numberConstraints.min = firstDivisibleInRange
	//fast-check defaults max to 0x7fffffff which prevents larger divisible numbers from being produced
	numberConstraints.max = max

	const integerArbitrary = fc.integer(numberConstraints)

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

const getFastCheckNumberConstraints = (node: IntersectionNode) => {
	const hasDivisor = node.prestructurals.find(refinement =>
		refinement.hasKind("divisor")
	)
	const numberConstraints: fc.DoubleConstraints & {
		divisor?: number
	} = {
		noNaN: !node.inner.domain?.numberAllowsNaN
	}

	for (const refinement of node.prestructurals) {
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
			numberConstraints[refinement.kind] = rule
		} else if (refinement.hasKind("divisor"))
			numberConstraints["divisor"] = refinement.rule
	}

	return numberConstraints
}
