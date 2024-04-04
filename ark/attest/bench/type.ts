import { caller, filePath } from "@arktype/fs"
import { throwInternalError } from "@arktype/util"
import * as tsvfs from "@typescript/vfs"
import ts from "typescript"
import {
	TsServer,
	getAbsolutePosition,
	getAncestors,
	getDescendants,
	getInternalTypeChecker,
	getTsConfigInfoOrThrow,
	getTsLibFiles,
	nearestCallExpressionChild
} from "../cache/ts.js"
import { getExpressionsByName } from "../cache/writeAssertionCache.js"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.js"
import type { BenchContext } from "./bench.js"
import {
	createTypeComparison,
	type Measure,
	type MeasureComparison,
	type TypeUnit
} from "./measure.js"

export type BenchTypeAssertions = {
	types: (instantiations?: Measure<TypeUnit>) => void
}

const getIsolatedEnv = () => {
	const tsconfigInfo = getTsConfigInfoOrThrow()
	const libFiles = getTsLibFiles(tsconfigInfo.parsed.options)
	const projectRoot = process.cwd()
	const system = tsvfs.createFSBackedSystem(
		libFiles.defaultMapFromNodeModules,
		projectRoot,
		ts
	)
	return tsvfs.createVirtualTypeScriptEnvironment(
		system,
		[],
		ts,
		tsconfigInfo.parsed.options
	)
}

const createFile = (
	env: tsvfs.VirtualTypeScriptEnvironment,
	fileName: string,
	fileText: string
) => {
	env.createFile(fileName, fileText)
	return env.getSourceFile(fileName)
}

const getProgram = (env?: tsvfs.VirtualTypeScriptEnvironment) => {
	return env?.languageService.getProgram()
}
const getInstantiationsWithFile = (fileText: string, fileName: string) => {
	const env = getIsolatedEnv()
	const file = createFile(env, fileName, fileText)
	getProgram(env)?.emit(file)
	const instantiationCount =
		getInternalTypeChecker(env).getInstantiationCount()
	return instantiationCount
}

const getFirstAncestorByKindOrThrow = (node: ts.Node, kind: ts.SyntaxKind) =>
	getAncestors(node).find((ancestor) => ancestor.kind === kind) ??
	throwInternalError(
		`Could not find an ancestor of kind ${ts.SyntaxKind[kind]}`
	)

const getBaselineSourceFile = (originalFile: ts.SourceFile): string => {
	const benchCalls = getExpressionsByName(originalFile, ["bench"])

	const benchExpressions = benchCalls.map((node) =>
		getFirstAncestorByKindOrThrow(node, ts.SyntaxKind.ExpressionStatement)
	)

	let baselineSourceFileText = originalFile.getFullText()

	benchExpressions.forEach((benchExpression) => {
		baselineSourceFileText = baselineSourceFileText.replace(
			benchExpression.getFullText(),
			""
		)
	})

	return baselineSourceFileText
}

const instantiationsByPath: { [path: string]: number } = {}

const getInstantiationsContributedByNode = (
	benchBlock: ts.FunctionExpression | ts.ArrowFunction
) => {
	const originalFile = benchBlock.getSourceFile()
	const originalPath = filePath(originalFile.fileName)
	const fakePath = originalPath + ".nonexistent.ts"

	const baselineFile = getBaselineSourceFile(originalFile)

	const baselineFileWithBenchBlock =
		baselineFile +
		`\nconst $attestIsolatedBench = ${benchBlock.getFullText()}`

	if (!instantiationsByPath[fakePath]) {
		console.log(`⏳ attest: Analyzing type assertions...`)
		const instantiationsWithoutNode = getInstantiationsWithFile(
			baselineFile,
			fakePath
		)

		instantiationsByPath[fakePath] = instantiationsWithoutNode
		console.log(`⏳ Cached type assertions \n`)
	}

	const instantiationsWithNode = getInstantiationsWithFile(
		baselineFileWithBenchBlock,
		fakePath
	)

	return instantiationsWithNode - instantiationsByPath[fakePath]
}

export const createBenchTypeAssertion = (
	ctx: BenchContext
): BenchTypeAssertions => ({
	types: (...args: [instantiations?: Measure<TypeUnit> | undefined]) => {
		ctx.lastSnapCallPosition = caller()
		const instance = TsServer.instance
		const file = instance.getSourceFileOrThrow(ctx.benchCallPosition.file)

		const benchNode = nearestCallExpressionChild(
			file,
			getAbsolutePosition(file, ctx.benchCallPosition)
		)
		const benchFn = getExpressionsByName(benchNode, ["bench"])
		if (!benchFn) {
			throw new Error("Unable to retrieve bench expression node.")
		}

		const benchBody = getDescendants(benchFn[0]).find(
			(node) => ts.isArrowFunction(node) || ts.isFunctionExpression(node)
		) as ts.ArrowFunction | ts.FunctionExpression | undefined

		if (!benchBody) {
			throw new Error("Unable to retrieve bench body node.")
		}

		const instantiationsContributed =
			getInstantiationsContributedByNode(benchBody)

		const comparison: MeasureComparison<TypeUnit> = createTypeComparison(
			instantiationsContributed,
			args[0]
		)
		compareToBaseline(comparison, ctx)
		queueBaselineUpdateIfNeeded(comparison.updated, args[0], {
			...ctx,
			kind: "types"
		})
	}
})
