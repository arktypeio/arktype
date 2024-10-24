import { throwInternalError } from "@ark/util"
import { string, stringMatching, type Arbitrary } from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"
import type { RuleByRefinementKind } from "../refinements.ts"

export const buildStringArbitrary = (ctx: Ctx): Arbitrary<string> => {
	const refinements = ctx.refinements

	const lengthConstraints: RuleByRefinementKind = {}

	if ("minLength" in refinements)
		lengthConstraints.minLength = refinements.minLength

	if ("maxLength" in refinements)
		lengthConstraints.maxLength = refinements.maxLength

	if ("exactLength" in refinements) {
		lengthConstraints.maxLength = refinements.exactLength
		lengthConstraints.minLength = refinements.exactLength
	}

	if ("pattern" in refinements) {
		if (refinements.minLength || refinements.maxLength)
			throwInternalError("Bounded regex is not supported.")
		return stringMatching(new RegExp(refinements.pattern))
	}

	return string(lengthConstraints)
}
