import type { nodeOfKind, RefinementKind } from "@ark/schema"
import { nearestFloat, throwInternalError } from "@ark/util"
import type { Ctx } from "./fastCheckContext.ts"

export const setRefinement = (
	refinementNode: nodeOfKind<RefinementKind>,
	ctx: Ctx
): void => {
	if (refinementNode.hasKind("pattern")) {
		if (ctx.refinements.pattern !== undefined)
			throwInternalError("Multiple regexes on a single node is not supported.")
	}
	if (refinementNode.hasKindIn("min", "max")) {
		ctx.refinements[refinementNode.kind] =
			"exclusive" in refinementNode ?
				nearestFloat(
					refinementNode.rule,
					refinementNode.hasKind("min") ? "+" : "-"
				)
			:	refinementNode.rule
	} else ctx.refinements[refinementNode.kind] = refinementNode.rule as never
}
