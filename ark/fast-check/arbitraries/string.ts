import type { nodeOfKind, RefinementKind } from "@ark/schema"
import { throwInternalError, type array } from "@ark/util"
import { string, stringMatching, type Arbitrary } from "fast-check"
import type { RuleByRefinementKind } from "../arktypeFastCheck.ts"
import type { DomainInputNode } from "./domain.ts"

const getRefinements = (refinements: array<nodeOfKind<RefinementKind>>) => {
	const ruleByRefinementKind: RuleByRefinementKind = {}
	for (const refinement of refinements) {
		if (refinement.hasKind("pattern")) {
			if (ruleByRefinementKind.pattern !== undefined) {
				throwInternalError(
					"Multiple regexes on a single node is not supported."
				)
			}
		}
		if (refinement.hasKind("exactLength")) {
			ruleByRefinementKind["minLength"] = refinement.rule
			ruleByRefinementKind["maxLength"] = refinement.rule
		} else
			ruleByRefinementKind[refinement.kind as never] = refinement.rule as never
	}
	return ruleByRefinementKind
}

export const buildStringArbitrary = (
	node: DomainInputNode
): Arbitrary<string> => {
	if (node.hasKind("domain")) return string()
	const refinements = getRefinements(node.refinements)
	if ("pattern" in refinements) {
		if (refinements.minLength || refinements.maxLength)
			throwInternalError("Bounded regex is not supported.")
		return stringMatching(new RegExp(refinements.pattern))
	}

	return string(refinements)
}
