import {
	createDepthIdentifier,
	type Arbitrary,
	type DepthIdentifier,
	type LetrecLooselyTypedTie
} from "fast-check"

export type Ctx = {
	seenIntersectionIds: Record<string, true>
	arbitrariesByIntersectionId: Record<string, Arbitrary<unknown>>
	tieStack: LetrecLooselyTypedTie[]
	depthIdentifier: DepthIdentifier
}

export const initializeContext = (): Ctx => ({
	seenIntersectionIds: {},
	arbitrariesByIntersectionId: {},
	tieStack: [],
	depthIdentifier: createDepthIdentifier()
})
