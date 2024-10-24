import type { Arbitrary, LetrecLooselyTypedTie } from "fast-check"
import type { RuleByRefinementKind } from "./refinements.ts"

export type Ctx = {
	refinements: RuleByRefinementKind
	seenIntersectionIds: Record<string, true>
	arbitrariesByIntersectionId: Record<string, Arbitrary<unknown>>
	isCyclic: boolean
	tieStack: LetrecLooselyTypedTie[]
	mustGenerate: Record<string, Arbitrary<unknown>>
}

export const initializeContext = (): Ctx => ({
	refinements: {},
	seenIntersectionIds: {},
	arbitrariesByIntersectionId: {},
	isCyclic: false,
	tieStack: [],
	mustGenerate: {}
})

export const getCtxWithNoRefinements = (oldCtx: Ctx): Ctx => ({
	...oldCtx,
	refinements: {}
})
