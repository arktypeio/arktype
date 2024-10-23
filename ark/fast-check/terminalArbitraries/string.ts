import { string, stringMatching, type Arbitrary } from "fast-check"
import type { Ctx, RuleByRefinementKind } from "../fastCheckContext.ts"

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
	//pattern todoshawn add in .filter if there's length constraints
	if ("pattern" in refinements)
		return stringMatching(new RegExp(refinements.pattern))

	return string(lengthConstraints)
}
