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
	const { min: minBound, max: maxBound, divisor } = numberConstraints
	const hasMax = hasKey(numberConstraints, "max")
	const hasMin = hasKey(numberConstraints, "min")

	if (divisor === undefined) {
		if (minBound !== undefined && maxBound !== undefined && minBound > maxBound)
			throw new Error(`No number value satisfies >=${minBound} & <=${maxBound}`)

		if (minBound === Number.POSITIVE_INFINITY)
			return fc.constant(Number.POSITIVE_INFINITY)
		if (maxBound === Number.NEGATIVE_INFINITY)
			return fc.constant(Number.NEGATIVE_INFINITY)
		return fc.double(numberConstraints)
	}

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

	const rawMin = numberConstraints.min ?? -Number.MAX_VALUE
	const rawMax = numberConstraints.max ?? Number.MAX_VALUE
	const min =
		numberConstraints.min ??
		((
			numberConstraints.max !== undefined &&
			numberConstraints.max < Number.MIN_SAFE_INTEGER
		) ?
			-Number.MAX_VALUE
		:	Number.MIN_SAFE_INTEGER)
	const max =
		numberConstraints.max ??
		((
			numberConstraints.min !== undefined &&
			numberConstraints.min > Number.MAX_SAFE_INTEGER
		) ?
			Number.MAX_VALUE
		:	Number.MAX_SAFE_INTEGER)

	const d = Math.abs(divisor)
	const safeMin = Math.max(rawMin, Number.MIN_SAFE_INTEGER)
	const safeMax = Math.min(rawMax, Number.MAX_SAFE_INTEGER)
	const kMin = Math.ceil(safeMin / d)
	const kMax = Math.floor(safeMax / d)

	if (safeMin > safeMax || kMin > kMax) {
		const outsideRanges: [number, number][] = []
		if (rawMax > Number.MAX_SAFE_INTEGER) {
			outsideRanges.push([
				Math.max(rawMin, Number.MAX_SAFE_INTEGER + 1),
				rawMax
			])
		}
		if (rawMin < Number.MIN_SAFE_INTEGER) {
			outsideRanges.push([
				rawMin,
				Math.min(rawMax, Number.MIN_SAFE_INTEGER - 1)
			])
		}
		for (const [lo, hi] of outsideRanges) {
			if (lo > hi) continue
			if (d === 1) {
				return fc.double({
					min: lo,
					max: hi,
					noNaN: true,
					noDefaultInfinity: true
				})
			}
			const bigArb = buildLargeDivisorArbitrary(lo, hi, d)
			if (bigArb) return bigArb
		}
		throw new Error(
			`No values within range ${min} - ${max} are divisible by ${divisor}.`
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

const gcdBigInt = (a: bigint, b: bigint): bigint => {
	while (b !== 0n) [a, b] = [b, a % b]
	return a
}

// For ranges outside safe integers with divisor d > 1, every double in a binade
// is a multiple of its ULP (a power of 2). Multiples of lcm(ulp, d) inside that
// binade are exact doubles divisible by d.
const buildLargeDivisorArbitrary = (
	min: number,
	max: number,
	d: number
): fc.Arbitrary<number> | undefined => {
	const dBig = BigInt(d)
	let anchor = min > 0 ? min : max
	for (let stepCount = 0; stepCount < 64; stepCount++) {
		const ulp =
			Math.abs(anchor) === Number.MAX_VALUE ?
				Math.abs(anchor - nearestFloat(anchor, anchor > 0 ? "-" : "+"))
			:	Math.abs(nearestFloat(anchor, anchor > 0 ? "+" : "-") - anchor)
		const ulpBig = BigInt(ulp)
		const step = (ulpBig / gcdBigInt(ulpBig, dBig)) * dBig
		// stay within the anchor's binade so step stays exact without overflowing MAX_VALUE
		const binStart = ulp * 2 ** 52
		const binEnd = binStart + (binStart - ulp)
		const binLow = anchor > 0 ? binStart : -binEnd
		const binHigh = anchor > 0 ? binEnd : -binStart
		const lo = BigInt(Math.max(min, binLow))
		const hi = BigInt(Math.min(max, binHigh))
		const kMin = lo >= 0n ? (lo + step - 1n) / step : lo / step
		const kMax = hi >= 0n ? hi / step : (hi - step + 1n) / step
		if (kMin <= kMax) {
			const kMinNum = Number(kMin)
			const kMaxNum = Number(kMax)
			if (Number.isSafeInteger(kMinNum) && Number.isSafeInteger(kMaxNum)) {
				return fc
					.integer({ min: kMinNum, max: kMaxNum })
					.map(k => Number(BigInt(k) * step))
			}
		}
		if (anchor > 0) {
			if (binEnd >= max || binEnd === Number.MAX_VALUE) return
			anchor = nearestFloat(binEnd, "+")
		} else {
			if (binLow <= min || binLow === -Number.MAX_VALUE) return
			anchor = nearestFloat(binLow, "-")
		}
	}
}

const getFastCheckNumberConstraints = (node: IntersectionNode) => {
	const hasDivisor = node.preStruct.find(refinement => refinement.is("divisor"))
	const allowsInfinity = Boolean(node.inner.domain?.numberAllowsInfinity)
	const numberConstraints: fc.DoubleConstraints & {
		divisor?: number
	} = {
		noNaN: !node.inner.domain?.numberAllowsNaN,
		noDefaultInfinity: !allowsInfinity
	}

	for (const refinement of node.preStruct) {
		if (refinement.hasKindIn("min", "max")) {
			const isMin = refinement.is("min")
			let rule = refinement.rule
			if (!Number.isFinite(rule)) {
				if (isMin) {
					if (rule === Number.NEGATIVE_INFINITY) {
						if (refinement.exclusive && allowsInfinity && !hasDivisor)
							numberConstraints.min = -Number.MAX_VALUE
						continue
					}
					if (refinement.exclusive || !allowsInfinity || hasDivisor) {
						throw new Error(
							`No number satisfies ${refinement.comparator}${rule}`
						)
					}
					numberConstraints.min = Number.POSITIVE_INFINITY
					continue
				}
				if (rule === Number.POSITIVE_INFINITY) {
					if (refinement.exclusive && allowsInfinity && !hasDivisor)
						numberConstraints.max = Number.MAX_VALUE
					continue
				}
				if (refinement.exclusive || !allowsInfinity || hasDivisor)
					throw new Error(`No number satisfies ${refinement.comparator}${rule}`)
				numberConstraints.max = Number.NEGATIVE_INFINITY
				continue
			}
			if (refinement.exclusive) {
				rule = nearestFloat(rule, isMin ? "+" : "-")
				if (!Number.isFinite(rule) && (!allowsInfinity || hasDivisor)) {
					throw new Error(
						`No number satisfies ${refinement.comparator}${refinement.rule}`
					)
				}
			}

			if (hasDivisor !== undefined)
				rule = isMin ? Math.ceil(rule) : Math.floor(rule)
			numberConstraints[refinement.kind] = rule
			numberConstraints.noNaN = true
		} else if (refinement.is("divisor")) {
			numberConstraints["divisor"] = refinement.rule
			numberConstraints.noNaN = true
		}
	}

	if (
		numberConstraints.min !== undefined ||
		numberConstraints.max !== undefined
	)
		numberConstraints.noNaN = true

	return numberConstraints
}
