import { letrec, type Arbitrary, type LetrecValue } from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"

export const buildCyclicArbitrary = <t>(
	buildRoot: () => Arbitrary<t>,
	ctx: Ctx
): Arbitrary<t> => {
	const objectArbitrary: LetrecValue<unknown> = letrec(tie => {
		ctx.tieStack.push(tie)
		const arbitraries: Record<string, Arbitrary<unknown>> = {
			root: buildRoot(),
			...ctx.arbitrariesByIntersectionId
		}
		ctx.tieStack.pop()
		// an intersection still being built encloses the root, so an alias to it, e.g. from a type parsed as its own alias, ties to the root
		for (const id in ctx.seenIntersectionIds)
			arbitraries[id] ??= arbitraries.root
		return arbitraries
	})
	return (objectArbitrary as never)["root"]
}
