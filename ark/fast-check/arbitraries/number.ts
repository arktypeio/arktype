import type { IntersectionNode } from "arktype/schema"
import { hasKey, nearestFloat, throwInternalError } from "arktype/util"
import * as fc from "fast-check"
import type { DomainInputNode } from "./domain.ts"

export const buildNumberArbitrary = (
	node: DomainInputNode
): fc.Arbitrary<number> => {
	if (node.is("domain")) {
		return fc.double({
			noNaN: !node.numberAllowsNaN,
			noDefaultInfinity: !node.numberAllowsInfinity
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

	const d = Math.abs(divisor)
	const kMin = Math.ceil(min / d)
	const kMax = Math.floor(max / d)

	if (kMin > kMax) {
		throw new Error(
			`No values within range ${numberConstraints.min} - ${numberConstraints.max} are divisible by ${numberConstraints.divisor}.`
		)
	}

	const excluded = node.is("intersection") ? node.inner.notEqual : undefined
	if (excluded?.length && kMax - kMin <= 1024) {
		const valid: number[] = []
		for (let k = kMin; k <= kMax; k++) {
			const value = k === 0 ? 0 : k * d
			if (excluded.every(ex => ex.tAllows(value as never))) valid.push(value)
		}
		if (!valid.length) {
			throw new Error(
				`No values within range ${min} - ${max} divisible by ${divisor} satisfy != constraints.`
			)
		}
		return fc.constantFrom(...valid)
	}

	return fc.integer({ min: kMin, max: kMax }).map(k => (k === 0 ? 0 : k * d))
}

const getFastCheckNumberConstraints = (node: IntersectionNode) => {
	const hasDivisor = node.preStruct.find(refinement => refinement.is("divisor"))
	const numberConstraints: fc.DoubleConstraints & {
		divisor?: number
	} = {
		noNaN: !node.inner.domain?.numberAllowsNaN,
		noDefaultInfinity: !node.inner.domain?.numberAllowsInfinity
	}

	for (const refinement of node.preStruct) {
		if (refinement.hasKindIn("min", "max")) {
			let rule = refinement.rule
			if (refinement.exclusive)
				rule = nearestFloat(refinement.rule, refinement.is("min") ? "+" : "-")

			if (hasDivisor !== undefined)
				rule = refinement.is("min") ? Math.ceil(rule) : Math.floor(rule)
			numberConstraints[refinement.kind] = rule
		} else if (refinement.is("divisor"))
			numberConstraints["divisor"] = refinement.rule
	}

	return numberConstraints
}
