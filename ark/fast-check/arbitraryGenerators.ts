import {
	date,
	double,
	integer,
	string,
	stringMatching,
	type Arbitrary
} from "fast-check"
import type { NodeDetails } from "./arktypeFastCheck.ts"

export const generateStringArbitrary = (
	nodeDetails: NodeDetails
): Arbitrary<string> => {
	const { pattern, minLength = 0, maxLength = 10 } = nodeDetails
	if (pattern !== undefined) {
		return stringMatching(new RegExp(pattern)).filter(
			regExp => regExp.length >= minLength && regExp.length <= maxLength
		)
	}
	if (nodeDetails.exactLength) {
		const length = nodeDetails.exactLength
		return string({ minLength: length, maxLength: length })
	}
	return string({ minLength, maxLength })
}

type DateConstraints = { min?: Date; max?: Date }

export const generateDateArbitrary = ({
	after,
	before
}: NodeDetails): Arbitrary<Date> => {
	const dateConstraints: DateConstraints = {}
	if (after) dateConstraints.min = after
	if (before) dateConstraints.max = before
	return date(dateConstraints)
}

export const generateNumberArbitrary = (
	nodeDetails: NodeDetails
): Arbitrary<number> => {
	const { min, max, divisor = 1 } = nodeDetails

	const generateInteger = (constraints = {}) =>
		integer(constraints).map(n => n * divisor)

	const generateDouble = (constraints = {}) =>
		double(constraints).map(n => n * divisor)

	const hasMin = min !== undefined
	const hasMax = max !== undefined
	if (hasMin || hasMax) {
		if (hasMin && hasMax) {
			return Number.isInteger(min) && Number.isInteger(max) ?
					generateInteger({ min, max })
				:	generateDouble({ min, max })
		}

		if (hasMin) {
			return Number.isInteger(min) ?
					generateInteger({ min })
				:	generateDouble({ min })
		}

		if (hasMax) {
			return Number.isInteger(max) ?
					generateInteger({ max })
				:	generateDouble({ max })
		}
	}
	return generateInteger()
}
