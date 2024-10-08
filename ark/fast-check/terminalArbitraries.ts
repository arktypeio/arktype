import { hasKey } from "@ark/util"
import {
	date,
	double,
	integer,
	string,
	stringMatching,
	type Arbitrary
} from "fast-check"
import type { FastCheckContext } from "./fastCheckContext.ts"

type BoundConstraints = NumberConstraints | StringConstraints

type NumberConstraints = "min" | "max"

type StringConstraints = "minLength" | "maxLength"

type Transforms = {
	[k in BoundConstraints]?: (value: number) => number
}

type ConstraintContext = (
	fastCheckContext: FastCheckContext,
	constraintKeys: BoundConstraints[],
	transforms?: Transforms
) => Record<string, number>

export const generateStringArbitrary = (
	fastCheckContext: FastCheckContext
): Arbitrary<string> => {
	const nodeContext = fastCheckContext.currentNodeContext
	const pattern = nodeContext.pattern
	const constraints = getNumericBoundConstraints(fastCheckContext, [
		"minLength",
		"maxLength"
	])
	if (pattern !== undefined) {
		if (Object.keys(constraints).length)
			throw new Error("Bounded Regular Expressions are not supported.")
		return stringMatching(new RegExp(pattern))
	}
	if (nodeContext.exactLength !== undefined) {
		return string({
			minLength: nodeContext.exactLength,
			maxLength: nodeContext.exactLength
		})
	}
	return string(constraints)
}

export const generateDateArbitrary = (
	fastCheckContext: FastCheckContext
): Arbitrary<Date> => {
	const dateConstraints: { min?: Date; max?: Date } = {}
	const after = fastCheckContext.currentNodeContext.after
	const before = fastCheckContext.currentNodeContext.before
	if (after !== undefined) dateConstraints.min = after
	if (before !== undefined) dateConstraints.max = before
	return date(dateConstraints)
}

export const generateNumberArbitrary = (
	fastCheckContext: FastCheckContext
): Arbitrary<number> => {
	const condensedNodeContext = fastCheckContext.currentNodeContext
	const hasMax = condensedNodeContext.max !== undefined
	const hasMin = condensedNodeContext.min !== undefined

	if ("divisor" in condensedNodeContext) {
		const constraints = getNumericBoundConstraints(
			fastCheckContext,
			["min", "max"],
			{
				min: (value: number) => Math.ceil(value),
				max: (value: number) => Math.floor(value)
			}
		)
		if (hasMin && hasMax && constraints.min > constraints.max) {
			throw new Error(
				`No integer value satisfies >${constraints.min} & <${constraints.max}`
			)
		}

		const firstDivisibleInRange =
			Math.ceil(
				(constraints.min ?? Number.MIN_SAFE_INTEGER) /
					condensedNodeContext.divisor
			) * condensedNodeContext.divisor

		if (firstDivisibleInRange > (constraints.max ?? Number.MAX_SAFE_INTEGER)) {
			throw new Error(
				`No values within range ${constraints.min} - ${constraints.max} are divisible by ${condensedNodeContext.divisor}.`
			)
		}

		return integer(constraints).filter(
			num => num % condensedNodeContext.divisor! === 0
		)
	}
	const constraints = getNumericBoundConstraints(fastCheckContext, [
		"min",
		"max"
	])
	return double(constraints)
}

const getNumericBoundConstraints: ConstraintContext = (
	fastCheckContext: FastCheckContext,
	constraintKeys: BoundConstraints[],
	transforms?: Transforms
) => {
	const constraints: Record<PropertyKey, number> = {}
	for (const key of constraintKeys) {
		if (hasKey(fastCheckContext.currentNodeContext, key)) {
			const constraintValue = fastCheckContext.currentNodeContext[key]!
			constraints[key] =
				transforms !== undefined && hasKey(transforms, key) ?
					transforms[key]!(constraintValue)
				:	constraintValue
		}
	}
	return constraints
}
