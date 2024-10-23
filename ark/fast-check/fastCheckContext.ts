import type { nodeOfKind, RefinementKind } from "@ark/schema"
import type { Arbitrary, LetrecLooselyTypedTie } from "fast-check"

export type Ctx = {
	refinements: RuleByRefinementKind
	seenIntersectionIds: Record<string, true>
	arbitrariesByIntersectionId: Record<string, Arbitrary<unknown>>
	isCyclic: boolean
	tieStack: LetrecLooselyTypedTie[]
}

export const initializeContext = (): Ctx => ({
	refinements: {},
	seenIntersectionIds: {},
	arbitrariesByIntersectionId: {},
	isCyclic: false,
	tieStack: []
})

export const getCtxWithNoRefinements = (oldCtx: Ctx): Ctx => ({
	...oldCtx,
	refinements: {}
})

export type RuleByRefinementKind = {
	[k in RefinementKind]?: nodeOfKind<k>["inner"]["rule"]
}
