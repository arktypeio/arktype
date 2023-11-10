import { caller, filePath } from "@arktype/fs"
import { throwInternalError } from "@arktype/util"
import * as tsvfs from "@typescript/vfs"
import ts from "typescript"
import { getInternalTypeChecker } from "../tsserver/analysis.ts"
import {
	getAncestors,
	getDescendants,
	getExpressionsByName
} from "../tsserver/getAssertionsInFile.ts"
import {
	getAbsolutePosition,
	getTsConfigInfoOrThrow,
	getTsLibFiles,
	nearestCallExpressionChild,
	TsServer
} from "../tsserver/tsserver.ts"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.ts"
import type { BenchContext } from "./bench.ts"
import type { Measure, MeasureComparison, TypeUnit } from "./measure.ts"
import { createTypeComparison } from "./measure.ts"

export type BenchTypeAssertions = {
	types: (instantiations?: Measure<TypeUnit>) => void
}

let __virtualEnv: tsvfs.VirtualTypeScriptEnvironment | undefined
const getIsolatedEnv = () => {
	if (__virtualEnv) {
		return __virtualEnv
	}
	const tsconfigInfo = getTsConfigInfoOrThrow()
	const libFiles = getTsLibFiles(tsconfigInfo.compilerOptions)
	const system = tsvfs.createSystem(libFiles.defaultMapFromNodeModules)
	__virtualEnv = tsvfs.createVirtualTypeScriptEnvironment(
		system,
		[],
		ts,
		tsconfigInfo.compilerOptions
	)
	return __virtualEnv
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
	const instantiationCount = getInternalTypeChecker(env).getInstantiationCount()
	return instantiationCount
}

const transformBenchSource = (
	originalFile: ts.SourceFile,
	isolatedBenchExpressionText: string,
	includeBenchFn: boolean,
	fakePath: string
) => {
	getIsolatedEnv().createFile(fakePath, originalFile.getFullText())
	const fileToTransform = getIsolatedEnv().getSourceFile(fakePath)!
	const currentBenchStatement =
		getDescendants(fileToTransform).find(
			(descendant) =>
				descendant.kind === ts.SyntaxKind.ExpressionStatement &&
				descendant.getText() === isolatedBenchExpressionText
		) ??
		throwInternalError(
			`Could not find a bench expression with text ${isolatedBenchExpressionText}`
		)
	if (!includeBenchFn) {
		return fileToTransform
			.getFullText()
			.replace(currentBenchStatement.getFullText(), "")
	}
	return fileToTransform.getText()
}

const getFirstAncestorByKindOrThrow = (node: ts.Node, kind: ts.SyntaxKind) =>
	getAncestors(node).find((ancestor) => ancestor.kind === kind) ??
	throwInternalError(
		`Could not find an ancestor of kind ${ts.SyntaxKind[kind]}`
	)

const instantiationsByPath: { [path: string]: number } = {}

const getInstantiationsContributedByNode = (benchCall: ts.CallExpression) => {
	const originalFile = benchCall.getSourceFile()
	const originalPath = filePath(originalFile.fileName)
	const fakePath = originalPath + ".nonexistent.ts"
	const benchExpression = getFirstAncestorByKindOrThrow(
		benchCall,
		ts.SyntaxKind.ExpressionStatement
	)
	const originalBenchExpressionText = benchExpression.getText()
	if (!instantiationsByPath[fakePath]) {
		console.log(`⏳ attest: Analyzing type assertions...`)
		const instantiationsWithNode = getInstantiationsWithFile(
			transformBenchSource(
				originalFile,
				originalBenchExpressionText,
				true,
				fakePath
			),
			fakePath
		)
		instantiationsByPath[fakePath] = instantiationsWithNode
		console.log(`⏳ Cached type assertions \n`)
	}

	const instantiationsWithoutNode = getInstantiationsWithFile(
		transformBenchSource(
			originalFile,
			originalBenchExpressionText,
			false,
			fakePath
		),
		fakePath
	)
	return instantiationsByPath[fakePath] - instantiationsWithoutNode
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
		const instantiationsContributed = getInstantiationsContributedByNode(
			benchFn[0]
		)
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
