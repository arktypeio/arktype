import type { Arbitrary, LetrecLooselyTypedTie } from "fast-check"
import type { Context, NodeContext } from "./arktypeFastCheck.ts"

export type FastCheckContext = {
	containsAlias: boolean
	fastCheckTies: LetrecLooselyTypedTie[]
	convertedAliasNodesById: Record<string, Context>
	fastCheckAliasArbitrariesById: Record<string, Arbitrary<unknown>>
	currentNodeContext: Context
	arbitrariesById: Record<string, Arbitrary<unknown>>
	numberOfAliasNodesInStructure: number
}

export const createFastCheckContext = (
	node: NodeContext,
	convertedAliasNodesById: Record<string, NodeContext>
): FastCheckContext => ({
	containsAlias: false,
	fastCheckTies: [],
	convertedAliasNodesById,
	fastCheckAliasArbitrariesById: {},
	currentNodeContext: node,
	arbitrariesById: {},
	numberOfAliasNodesInStructure: Object.keys(convertedAliasNodesById).length
})

export const updateFastCheckContext = (
	fastCheckContext: FastCheckContext,
	nodeContext: NodeContext
): FastCheckContext => ({
	...fastCheckContext,
	currentNodeContext: nodeContext
})
