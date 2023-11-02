import { caller, filePath } from "@arktype/fs"
import tsvfs from "@typescript/vfs"
import ts from "typescript"
import { getInternalTypeChecker } from "../tsserver/analysis.js"
import { getExpressionsByName } from "../tsserver/getAssertionsInFile.js"
import {
	getAbsolutePosition,
	getNodeFromPosition,
	getSourceFile,
	getTsconfigInfoOrThrow,
	getTsLibFiles,
	TsServer
} from "../tsserver/tsserver.js"
import { compareToBaseline, queueBaselineUpdateIfNeeded } from "./baseline.js"
import type { BenchContext } from "./bench.js"
import type { Measure, MeasureComparison, TypeUnit } from "./measure.js"
import { createTypeComparison } from "./measure.js"

export type BenchTypeAssertions = {
	types: (instantiations?: Measure<TypeUnit>) => void
}

let __virtualEnv: tsvfs.VirtualTypeScriptEnvironment | undefined
const getIsolatedEnv = () => {
	if (__virtualEnv) {
		return __virtualEnv
	}
	const tsconfigInfo = getTsconfigInfoOrThrow()
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
	const currentBenchStatement = getFirstChildByKindOrThrow(
		fileToTransform,
		ts.SyntaxKind.ExpressionStatement,
		isolatedBenchExpressionText
	)
	if (!includeBenchFn) {
		return fileToTransform
			.getFullText()
			.replace(currentBenchStatement.getFullText(), "")
	}
	return fileToTransform.getText()
}

const isNodeOfType = <T extends ts.Node>(
	node: ts.Node,
	syntaxKind: ts.SyntaxKind
): node is T => {
	return node.kind === syntaxKind
}
const getFirstChildByKindOrThrow = <T extends ts.Node>(
	node: ts.Node,
	kind: ts.SyntaxKind,
	isolatedBenchExpressionText: string
): T => {
	let firstDescendent: T | undefined = undefined

	const iterateThroughChildren = (child: ts.Node) => {
		if (
			isNodeOfType<T>(child, kind) &&
			child.getText() === isolatedBenchExpressionText
		) {
			firstDescendent = child
		}
		ts.forEachChild(child, iterateThroughChildren)
	}

	iterateThroughChildren(node)

	if (!firstDescendent) {
		throw new Error(`Unable to find a node of type ${ts.SyntaxKind[kind]}`)
	}

	return firstDescendent
}

const getFirstAncestorByKindOrThrow = <T extends ts.Node>(
	call: ts.Node,
	kind: ts.SyntaxKind
): T => {
	let ancestor: T | undefined = undefined
	let possibleAncestorOfType: ts.Node | undefined = call

	while (possibleAncestorOfType && !ancestor) {
		if (isNodeOfType<T>(possibleAncestorOfType, kind)) {
			ancestor = possibleAncestorOfType as T
		}
		possibleAncestorOfType = possibleAncestorOfType.parent
	}

	if (!ancestor) {
		throw new Error(`Could not find an ancestor of kind ${ts.SyntaxKind[kind]}`)
	}

	return ancestor
}

const instantiationsByPath: { [path: string]: number } = {}

const getInstantiationsContributedByNode = (benchCall: ts.CallExpression) => {
	const originalFile = benchCall.getSourceFile()
	const originalPath = filePath(originalFile.fileName)
	const fakePath = originalPath + ".nonexistent.ts"
	const benchExpression = getFirstAncestorByKindOrThrow<ts.ExpressionStatement>(
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
		const file = getSourceFile(ctx.benchCallPosition.file)
		const benchNode = getNodeFromPosition(
			file,
			getAbsolutePosition(file, ctx.benchCallPosition)
		)!
		const benchFn = getExpressionsByName(benchNode, "bench")
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
