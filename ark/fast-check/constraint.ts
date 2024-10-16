import type { nodeOfKind, RefinementKind } from "@ark/schema"
import { hasKey, nearestFloat, throwInternalError } from "@ark/util"
import type { NodeContext } from "./arktypeFastCheck.ts"

export type ruleByRefinementKind = {
	[k in RefinementKind]?: nodeOfKind<k>["inner"]["rule"]
}

export const applyConstraint = (
	child: nodeOfKind<RefinementKind>,
	rootNode: NodeContext
): void => {
	if (child.hasKind("pattern")) {
		if (rootNode.pattern !== undefined)
			throwInternalError("Regex Intersection is not implemented.")
		rootNode["pattern"] = child.rule
	} else if (child.hasKindIn("min", "max")) {
		const rule = child.rule
		rootNode[child.kind] =
			hasKey(child, "exclusive") ?
				nearestFloat(rule, child.kind === "min" ? "+" : "-")
			:	rule
	} else Object.assign(rootNode, getConstraint(child.kind, child.rule))
}

export const getConstraint = <k extends RefinementKind>(
	kind: k,
	rule: ruleByRefinementKind[k]
): ruleByRefinementKind => {
	const constraint: ruleByRefinementKind = {}
	constraint[kind] = rule
	return constraint
}
