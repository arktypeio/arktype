import type { nodeOfKind, PrestructuralKind } from "@ark/schema"
import { throwInternalError, type array } from "@ark/util"
import * as fc from "fast-check"
import type { DomainInputNode } from "./domain.ts"

export const buildStringArbitrary = (
	node: DomainInputNode
): fc.Arbitrary<string> => {
	if (node.is("domain")) return fc.string()
	const stringConstraints = getFastCheckStringConstraints(node.preStruct)
	if ("pattern" in stringConstraints) {
		if (stringConstraints.minLength || stringConstraints.maxLength)
			throwInternalError("Bounded regex is not supported.")
		return fc.stringMatching(
			new RegExp(stringConstraints.pattern, stringConstraints.flags)
		)
	}

	return fc.string(stringConstraints)
}

const getFastCheckStringConstraints = (
	refinements: array<nodeOfKind<PrestructuralKind>>
) => {
	const stringConstraints: fc.StringConstraints & {
		pattern?: string
		flags?: string
	} = {}
	for (const refinement of refinements) {
		if (refinement.is("pattern")) {
			if (stringConstraints.pattern !== undefined) {
				throwInternalError(
					"Multiple regexes on a single node is not supported."
				)
			}
			stringConstraints["pattern"] = refinement.rule
			// the flags change what the source means (under u, \u{1F600} is one
			// code point rather than the text "u{1F600}"), so they must reach
			// fast-check. It rejects i, but a string matching without i also
			// matches with it, so dropping i only narrows what is generated.
			// Flags it cannot honor soundly (y, v) are passed through so it
			// throws rather than generating strings the type rejects.
			if (refinement.flags)
				stringConstraints["flags"] = refinement.flags.replace("i", "")
		} else if (refinement.is("exactLength")) {
			stringConstraints["minLength"] = refinement.rule
			stringConstraints["maxLength"] = refinement.rule
		} else
			stringConstraints[refinement.kind as never] = refinement.rule as never
	}
	return stringConstraints
}
