import { caller } from "@arktype/fs"
import ts from "typescript"
import { getTypeBenchAssertionsAtPosition } from "../cache/getCachedAssertions.js"
import {
	TsServer,
	getAbsolutePosition,
	getAncestors,
	getDescendants,
	nearestCallExpressionChild
} from "../cache/ts.js"
import {
	getCallExpressionsByName,
	getInstantiationsContributedByNode
} from "../cache/utils.js"
import type { TypeRelationship } from "../cache/writeAssertionCache.js"
import { getConfig } from "../config.js"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.js"
import type { BenchAssertionContext, BenchContext } from "./bench.js"
import {
	createTypeComparison,
	type Measure,
	type MeasureComparison,
	type TypeUnit
} from "./measure.js"

export type BenchTypeAssertions = {
	types: (instantiations?: Measure<TypeUnit>) => void
}

export const createBenchTypeAssertion = (
	ctx: BenchContext
): BenchTypeAssertions => ({
	types: (...args: [instantiations?: Measure<TypeUnit> | undefined]) => {
		ctx.lastSnapCallPosition = caller()
		instantiationDataHandler({ ...ctx, kind: "types" }, args[0])
	}
})

export const getContributedInstantiations = (ctx: BenchContext): number => {
	const testDeclarationAliases = getConfig().testDeclarationAliases
	const instance = TsServer.instance
	const file = instance.getSourceFileOrThrow(ctx.benchCallPosition.file)

	const node = nearestCallExpressionChild(
		file,
		getAbsolutePosition(file, ctx.benchCallPosition)
	)

	const firstMatchingNamedCall = getAncestors(node).find(
		call => getCallExpressionsByName(call, testDeclarationAliases).length
	)

	if (!firstMatchingNamedCall) {
		throw new Error(
			`No call expressions matching the name(s) '${testDeclarationAliases.join()}' were found`
		)
	}

	const body = getDescendants(firstMatchingNamedCall).find(
		node => ts.isArrowFunction(node) || ts.isFunctionExpression(node)
	) as ts.ArrowFunction | ts.FunctionExpression | undefined

	if (!body)
		throw new Error("Unable to retrieve contents of the call expression")

	return getInstantiationsContributedByNode(file, body)
}

export type ArgAssertionData = {
	type: string
	relationships: {
		args: TypeRelationship[]
		typeArgs: TypeRelationship[]
	}
}

export const instantiationDataHandler = (
	ctx: BenchAssertionContext,
	args?: Measure<TypeUnit>,
	isBenchFunction = true
): void => {
	const instantiationsContributed =
		isBenchFunction ?
			getContributedInstantiations(ctx)
		:	getTypeBenchAssertionsAtPosition(ctx.benchCallPosition)[0][1].count

	const comparison: MeasureComparison<TypeUnit> = createTypeComparison(
		instantiationsContributed,
		args
	)
	compareToBaseline(comparison, ctx)
	queueBaselineUpdateIfNeeded(comparison.updated, args, ctx)
}
