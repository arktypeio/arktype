import type { Arbitrary, LetrecLooselyTypedTie } from "fast-check"

export type Ctx = {
	seenIntersectionIds: Record<string, true>
	arbitrariesByIntersectionId: Record<string, Arbitrary<unknown>>
	isCyclic: boolean
	tieStack: LetrecLooselyTypedTie[]
}

export const initializeContext = (): Ctx => ({
	seenIntersectionIds: {},
	arbitrariesByIntersectionId: {},
	isCyclic: false,
	tieStack: []
})
