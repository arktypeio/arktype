import type { nodeOfKind } from "@ark/schema"
import { throwInternalError } from "@ark/util"
import { anything, array, tuple, uniqueArray } from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"
import { buildDateArbitrary } from "./date.ts"

export const buildProtoArbitrary = (node: nodeOfKind<"proto">, ctx: Ctx) => {
	switch (node.builtinName) {
		case "Array":
			if (ctx.refinements.exactLength === 0) return tuple()
			return array(anything(), ctx.refinements)
		case "Set":
			return uniqueArray(anything()).map(arr => new Set(arr))
		case "Date":
			return buildDateArbitrary(ctx)
		default:
			throwInternalError(`${node.builtinName} is not implemented`)
	}
}
