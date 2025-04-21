import type { nodeOfKind, PrestructuralKind } from "@ark/schema"
import { throwInternalError, type array } from "@ark/util"
import * as fc from "fast-check"
import type { DomainInputNode } from "./domain.ts"

export const buildStringArbitrary = (
	node: DomainInputNode
): fc.Arbitrary<string> => {
	if (node.hasKind("domain")) return fc.string()
	const stringConstraints = getFastCheckStringConstraints(node.prestructurals)
	if ("pattern" in stringConstraints) {
		if (stringConstraints.minLength || stringConstraints.maxLength)
			throwInternalError("Bounded regex is not supported.")
		return fc.stringMatching(new RegExp(stringConstraints.pattern))
	}

	return fc.string(stringConstraints)
}

const getFastCheckStringConstraints = (
	refinements: array<nodeOfKind<PrestructuralKind>>
) => {
	const stringConstraints: fc.StringConstraints & {
		pattern?: string
	} = {}
	for (const refinement of refinements) {
		if (refinement.hasKind("pattern")) {
			if (stringConstraints.pattern !== undefined) {
				throwInternalError(
					"Multiple regexes on a single node is not supported."
				)
			}
			stringConstraints["pattern"] = refinement.rule
		} else if (refinement.hasKind("exactLength")) {
			stringConstraints["minLength"] = refinement.rule
			stringConstraints["maxLength"] = refinement.rule
		} else
			stringConstraints[refinement.kind as never] = refinement.rule as never
	}
	return stringConstraints
}
