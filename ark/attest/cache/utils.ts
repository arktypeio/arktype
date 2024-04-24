import { filePath } from "@arktype/fs"
import { throwInternalError } from "@arktype/util"
import * as tsvfs from "@typescript/vfs"
import ts from "typescript"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import {
	getDescendants,
	getFirstAncestorByKindOrThrow,
	getProgram,
	getTsConfigInfoOrThrow,
	getTsLibFiles
} from "./ts.js"
import type {
	AssertionsByFile,
	LinePositionRange
} from "./writeAssertionCache.js"

export const getCallLocationFromCallExpression = (
	callExpression: ts.CallExpression
): LinePositionRange => {
	const start = ts.getLineAndCharacterOfPosition(
		callExpression.getSourceFile(),
		callExpression.getStart()
	)
	const end = ts.getLineAndCharacterOfPosition(
		callExpression.getSourceFile(),
		callExpression.getEnd()
	)
	// Add 1 to everything, since trace positions are 1-based and TS positions are 0-based.
	const location: LinePositionRange = {
		start: {
			line: start.line + 1,
			char: start.character + 1
		},
		end: {
			line: end.line + 1,
			char: end.character + 1
		}
	}
	return location
}

export const gatherInlineInstantiationData = (
	file: ts.SourceFile,
	fileAssertions: AssertionsByFile,
	attestAliasInstantiationMethodCalls: string[]
): void => {
	const expressions = getCallExpressionsByName(
		file,
		attestAliasInstantiationMethodCalls
	)
	if (!expressions.length) {
		return
	}
	const enclosingFunctions = expressions.map((expression) => {
		const attestInstantiationsExpression = getFirstAncestorByKindOrThrow(
			expression,
			ts.SyntaxKind.ExpressionStatement
		)
		return {
			ancestor: getFirstAncestorByKindOrThrow(
				attestInstantiationsExpression,
				ts.SyntaxKind.ExpressionStatement
			),
			position: getCallLocationFromCallExpression(expression)
		}
	})
	const instantiationInfo = enclosingFunctions.map((enclosingFunction) => {
		const body = getDescendants(enclosingFunction.ancestor).find(
			(node) => ts.isArrowFunction(node) || ts.isFunctionExpression(node)
		) as ts.ArrowFunction | ts.FunctionExpression | undefined
		if (!body) {
			throw new Error("Unable to find file contents")
		}

		return {
			location: enclosingFunction.position,
			count: getInstantiationsContributedByNode(file, body)
		}
	})
	const assertions = fileAssertions[getFileKey(file.fileName)] ?? []
	fileAssertions[getFileKey(file.fileName)] = [
		...assertions,
		...instantiationInfo
	]
}

export const getCallExpressionsByName = (
	startNode: ts.Node,
	names: string[],
	isSnapCall = false
): ts.CallExpression[] => {
	const calls: ts.CallExpression[] = []
	getDescendants(startNode).forEach((descendant) => {
		if (ts.isCallExpression(descendant)) {
			if (names.includes(descendant.expression.getText()) || !names.length) {
				calls.push(descendant)
			}
		} else if (isSnapCall) {
			if (ts.isIdentifier(descendant)) {
				if (names.includes(descendant.getText()) || !names.length) {
					calls.push(descendant as any as ts.CallExpression)
				}
			}
		}
	})
	return calls
}

const instantiationsByPath: { [path: string]: number } = {}

export const getInstantiationsContributedByNode = (
	file: ts.SourceFile,
	benchBlock: ts.FunctionExpression | ts.ArrowFunction
): number => {
	const originalPath = filePath(file.fileName)
	const fakePath = originalPath + ".nonexistent.ts"

	const baselineFile = getBaselineSourceFile(file)

	const baselineFileWithBenchBlock =
		baselineFile + `\nconst $attestIsolatedBench = ${benchBlock.getFullText()}`

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

export const createOrUpdateFile = (
	env: tsvfs.VirtualTypeScriptEnvironment,
	fileName: string,
	fileText: string
): ts.SourceFile | undefined => {
	env.sys.fileExists(fileName) ?
		env.updateFile(fileName, fileText)
	:	env.createFile(fileName, fileText)
	return env.getSourceFile(fileName)
}

const getInstantiationsWithFile = (fileText: string, fileName: string) => {
	const env = getIsolatedEnv()
	const file = createOrUpdateFile(env, fileName, fileText)
	const program = getProgram(env)
	program.emit(file)
	const count = program.getInstantiationCount()
	if (count === undefined) {
		throwInternalError(`Unable to gather instantiation count for ${fileText}`)
	}
	return count
}

let virtualEnv: tsvfs.VirtualTypeScriptEnvironment | undefined = undefined

export const getIsolatedEnv = (): tsvfs.VirtualTypeScriptEnvironment => {
	if (virtualEnv !== undefined) {
		return virtualEnv
	}
	const tsconfigInfo = getTsConfigInfoOrThrow()
	const libFiles = getTsLibFiles(tsconfigInfo.parsed.options)
	const projectRoot = process.cwd()
	const system = tsvfs.createFSBackedSystem(
		libFiles.defaultMapFromNodeModules,
		projectRoot,
		ts
	)
	virtualEnv = tsvfs.createVirtualTypeScriptEnvironment(
		system,
		[],
		ts,
		tsconfigInfo.parsed.options
	)
	return virtualEnv
}

const getBaselineSourceFile = (originalFile: ts.SourceFile): string => {
	const functionNames = getConfig().testDeclarationAliases

	const calls = getCallExpressionsByName(originalFile, functionNames)

	let baselineSourceFileText = originalFile.getFullText()

	calls.forEach((call) => {
		baselineSourceFileText = baselineSourceFileText.replace(
			call.getFullText(),
			""
		)
	})
	return baselineSourceFileText
}
