import type { nodeOfKind } from "@ark/schema"
import { letrec, type Arbitrary, type LetrecValue } from "fast-check"
import { buildObjectArbitrary } from "../arktypeFastCheck.ts"
import type { Ctx } from "../fastCheckContext.ts"

export const buildCyclicArbitrary = (
	node: nodeOfKind<"structure">,
	ctx: Ctx
): Arbitrary<Record<string, unknown>> => {
	const objectArbitrary: LetrecValue<unknown> = letrec(tie => {
		ctx.tieStack.push(tie)
		const arbitraries = {
			root: buildObjectArbitrary(node, ctx),
			...ctx.arbitrariesByIntersectionId
		}
		ctx.tieStack.pop()
		return arbitraries
	})
	return (objectArbitrary as never)["root"]
}
