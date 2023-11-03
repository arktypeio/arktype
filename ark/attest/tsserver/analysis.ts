import type tsvfs from "@typescript/vfs"
import type ts from "typescript"
import type { Diagnostic } from "typescript"
import { getConfig } from "../config.js"
import { getFileKey } from "../utils.js"
import {
	type AssertionData,
	getAssertionsInFile
} from "./getAssertionsInFile.js"
import { getCachedAssertionData } from "./getCachedAssertionData.js"
import { getDiagnosticsByFile } from "./getDiagnosticsByFile.js"
import { getProgram, TsServer } from "./tsserver.js"

export type AssertionsByFile = Record<string, AssertionData[]>

interface InternalTypeChecker extends ts.TypeChecker {
	// These APIs are not publicly exposed
	getInstantiationCount: () => number
	isTypeAssignableTo: (source: ts.Type, target: ts.Type) => boolean
	getDiagnostics: () => Diagnostic[]
}

export const getInternalTypeChecker = (
	env?: tsvfs.VirtualTypeScriptEnvironment
) => getProgram(env).getTypeChecker() as InternalTypeChecker

export const getTypeFromExpression = (expression: ts.Expression) => {
	const typeChecker = getInternalTypeChecker()
	const nodeType = typeChecker.getTypeAtLocation(expression)
	const typeAsString = typeChecker.typeToString(nodeType)

	return {
		node: nodeType,
		string: typeAsString
	}
}

type AnalyzeTypeAssertionsOptions = {
	isInitialCache?: boolean
}

let __assertionCache: undefined | AssertionsByFile

export const getAssertionsByFile = ({
	isInitialCache
}: AnalyzeTypeAssertionsOptions = {}): AssertionsByFile => {
	if (__assertionCache) {
		return __assertionCache
	}
	const config = getConfig()
	if (!isInitialCache) {
		return getCachedAssertionData(config)
	}
	const instance = TsServer.instance
	const filePaths = instance.programFilePaths
	const diagnosticsByFile = getDiagnosticsByFile()
	const assertionsByFile: AssertionsByFile = {}
	for (const path of filePaths) {
		const file = instance.getSourceFileOrThrow(path)
		const assertionsInFile = getAssertionsInFile(file, diagnosticsByFile)
		if (assertionsInFile.length) {
			assertionsByFile[getFileKey(file.fileName)] = assertionsInFile
		}
	}
	__assertionCache = assertionsByFile
	return assertionsByFile
}
