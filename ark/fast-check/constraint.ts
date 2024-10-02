import { Max, Min, type nodeOfKind, type RefinementKind } from "@ark/schema"
import { hasKey, includes, throwInternalError } from "@ark/util"
import { integer } from "fast-check"
import type { NodeContext } from "./arktypeFastCheck.ts"

export type ruleByRefinementKind = {
	[k in RefinementKind]?: nodeOfKind<k>["inner"]["rule"]
}

const setConstraint = <K extends RefinementKind>(
	kind: K,
	rule: Required<ruleByRefinementKind>[K],
	constraint: ruleByRefinementKind
) => {
	constraint[kind] = rule
}

export const applyConstraint = (
	child: nodeOfKind<RefinementKind>,
	rootNode: NodeContext
): void => {
	const kind = child.kind
	const rule = child.rule
	const constraint: ruleByRefinementKind = {}
	//todoshawn davido helpo
	if (typeof rule === "string") {
		if (kind === "pattern") {
			if (rootNode.pattern !== undefined)
				throwInternalError("Regex Intersection is not implemented.")
			constraint.pattern = rule
		}
	} else if (includes(numberConstraintKeywords, kind)) {
		if (typeof rule === "number") {
			constraint[kind] =
				hasKey(child, "exclusive") ?
					kind === "min" ?
						//todoshawn ask David if this or Epsilon since Epsilon needs to be increased
						rule + 0.0001
					:	rule - 0.0001
				:	rule
		}
	} else setConstraint(kind, rule, constraint)
	Object.assign(rootNode, constraint)
}

const numberConstraintKeywords = [
	Min.implementation.kind,
	Max.implementation.kind
]
