import { hasKey } from "@ark/util"
import {
	date,
	double,
	integer,
	string,
	stringMatching,
	type Arbitrary
} from "fast-check"
import type { FastCheckContext } from "./arbitraryBuilders.ts"

export const generateStringArbitrary = (
	fastCheckContext: FastCheckContext
): Arbitrary<string> => {
	const nodeContext = fastCheckContext.currentNodeContext
	const pattern = nodeContext.pattern
	const constraints = getNumericConstraints(fastCheckContext, {
		keys: ["minLength", "maxLength"]
	})
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
	context: FastCheckContext
): Arbitrary<Date> => {
	const dateConstraints: { min?: Date; max?: Date } = {}
	const after = context.currentNodeContext.after
	const before = context.currentNodeContext.before
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
	const constraints = getNumericConstraints(fastCheckContext, {
		keys: ["min", "max"]
	})
	if ("divisor" in condensedNodeContext) {
		for (const constraint in constraints) {
			constraints[constraint] =
				constraint === "min" ?
					Math.ceil(constraints[constraint])
				:	Math.floor(constraints[constraint])
		}

		if (hasMin && hasMax && constraints.min > constraints.max) {
			throw new Error(
				`No integer value satisfies >${constraints.min} & <${constraints.max}`
			)
		}
		return integer(constraints).filter(
			num => num % condensedNodeContext.divisor! === 0
		)
	}
	return double(constraints)
}
type t = ("min" | "max")[]
const a: t = ["min|max"]
const getNumericConstraints = <T extends keyof ConstraintContext>(
	fastCheckContext: FastCheckContext,
	constraintContext: "min|max"[]
) => {
	const constraints: Record<PropertyKey, number> = {}
	for (const key of constraintContext.keys) {
		if (hasKey(fastCheckContext.currentNodeContext, key))
			constraints[key] = fastCheckContext.currentNodeContext[key]!
	}
	return constraints
}

// //todoshawn
// type ConstraintContext = {
// 	numericConstraint: {
// 		keys: ["min", "max"]
// 	}
// 	lengthConstraint: {
// 		keys: ["minLength", "maxLength"]
// 	}
// }
