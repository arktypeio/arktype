import { filePath } from "@ark/fs"
import { throwInternalError } from "@ark/util"
import * as tsvfs from "@typescript/vfs"
import ts from "typescript"
import { getConfig } from "../config.ts"
import { getFileKey } from "../utils.ts"
import type { LinePositionRange } from "./getCachedAssertions.ts"
import {
	getDescendants,
	getFirstAncestorByKindOrThrow,
	getProgram,
	getTsConfigInfoOrThrow,
	getTsLibFiles
} from "./ts.ts"

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

/**
 * Processes inline instantiations from an attest call
 * Preserves any JSDoc comments that are associated with the original expression
 */
export const gatherInlineInstantiationData = (
	file: ts.SourceFile,
	assertionsByFile: Record<string, any[]>,
	instantiationMethodCalls: string[]
): void => {
	const expressions = getCallExpressionsByName(file, instantiationMethodCalls)
	if (!expressions.length) return

	const enclosingFunctions = expressions.map(expression => {
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
	const instantiationInfo = enclosingFunctions.map(enclosingFunction => {
		const body = getDescendants(enclosingFunction.ancestor).find(
			node => ts.isArrowFunction(node) || ts.isFunctionExpression(node)
		) as ts.ArrowFunction | ts.FunctionExpression | undefined
		if (!body) {
			throwInternalError(
				`Unable to resolve source associated with TS Node:
${enclosingFunction.ancestor.getText()}`
			)
		}

		return {
			location: enclosingFunction.position,
			count: getInstantiationsContributedByNode(file, body)
		}
	})
	const assertions = assertionsByFile[getFileKey(file.fileName)] ?? []
	assertionsByFile[getFileKey(file.fileName)] = [
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
	for (const descendant of getDescendants(startNode)) {
		if (ts.isCallExpression(descendant)) {
			if (names.includes(descendant.expression.getText()) || !names.length)
				calls.push(descendant)
		} else if (isSnapCall) {
			if (ts.isIdentifier(descendant)) {
				if (names.includes(descendant.getText()) || !names.length)
					calls.push(descendant as any as ts.CallExpression)
			}
		}
	}
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
		const instantiationsWithoutNode = getInstantiationsWithFile(
			baselineFile,
			fakePath
		)

		instantiationsByPath[fakePath] = instantiationsWithoutNode
	}

	const instantiationsWithNode = getInstantiationsWithFile(
		baselineFileWithBenchBlock,
		fakePath,
		// a generic block's result would be inferred from constraints it's
		// never called with
		!benchBlock.typeParameters?.length
	)

	return instantiationsWithNode - instantiationsByPath[fakePath]
}

/**
 * TS only evaluates the members of many types, e.g. mapped types, once
 * something reads them, so the result of the block appended last is
 * displayed to count it as if it were used.
 */
const displayBenchResult = (program: ts.Program, file: ts.SourceFile) => {
	const checker = program.getTypeChecker()
	const bench = file.statements[file.statements.length - 1]
	if (!ts.isVariableStatement(bench))
		throwInternalError(`Expected a bench declaration, got ${bench.getText()}`)
	const benchType = checker.getTypeAtLocation(
		bench.declarationList.declarations[0].name
	)
	for (const signature of benchType.getCallSignatures()) {
		checker.typeToString(
			signature.getReturnType(),
			undefined,
			ts.TypeFormatFlags.NoTruncation |
				ts.TypeFormatFlags.AllowUniqueESSymbolType |
				ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
		)
	}
}

export const createOrUpdateFile = (
	env: tsvfs.VirtualTypeScriptEnvironment,
	fileName: string,
	fileText: string
): ts.SourceFile | undefined => {
	if (env.sys.fileExists(fileName)) env.updateFile(fileName, fileText)
	else env.createFile(fileName, fileText)
	return env.getSourceFile(fileName)
}

declare module "typescript" {
	interface SourceFile {
		imports: ts.StringLiteral[]
	}

	interface Program {
		getResolvedModuleFromModuleSpecifier(
			moduleSpecifier: ts.StringLiteralLike,
			sourceFile?: ts.SourceFile
		): ts.ResolvedModuleWithFailedLookupLocations
	}
}

const getInstantiationsWithFile = (
	fileText: string,
	fileName: string,
	displayResult = false
) => {
	const env = getIsolatedEnv()
	const file = createOrUpdateFile(env, fileName, fileText)
	const program = getProgram(env)

	// trigger type checking to generate instantiations
	// (was previously program.emit(file), but that as of TS 5.6 that doesn't
	// work, so this may need to change if instantiations is reported as 0 after
	// a future TypeScript update)
	program.getSemanticDiagnostics(file)
	// this may lead to additional type checking per Jake Bailey from the TS
	// team, although it doesn't currently affect any of our internal benchmarks
	program.getDeclarationDiagnostics(file)
	if (displayResult && file) displayBenchResult(program, file)
	const count = program.getInstantiationCount()
	return count
}

let virtualEnv: tsvfs.VirtualTypeScriptEnvironment | undefined = undefined

export const getIsolatedEnv = (): tsvfs.VirtualTypeScriptEnvironment => {
	if (virtualEnv !== undefined) return virtualEnv

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

	// for each test function like `it` or `bench`, walk up the AST to find the complete expression
	for (const call of calls) {
		let currentNode: ts.Node = call

		// ensure we capture the entire chain like bench(...).types(...)
		while (currentNode.parent && !ts.isExpressionStatement(currentNode))
			currentNode = currentNode.parent

		const fullExpressionText = currentNode.getFullText()

		baselineSourceFileText = baselineSourceFileText.replace(
			fullExpressionText,
			""
		)
	}

	return baselineSourceFileText
}
