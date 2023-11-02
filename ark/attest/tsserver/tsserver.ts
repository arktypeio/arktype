import { dirname, join } from "node:path"
import { fromCwd, type SourcePosition } from "@arktype/fs"
import tsvfs from "@typescript/vfs"
import ts from "typescript"
import { getFileKey } from "../utils.js"
import type { LinePositionRange } from "./getAssertionsInFile.js"

export class TsServer {
	private static instance: TsServer | null = null
	programFilePaths: string[] | undefined
	virtualEnv: tsvfs.VirtualTypeScriptEnvironment

	constructor(private tsConfigInfo: TsconfigInfo) {
		const tsLibPaths = getTsLibFiles(tsConfigInfo.compilerOptions)
		this.virtualEnv = this.getVirtualEnv(tsLibPaths.resolvedPaths)
	}

	static getInstance(): TsServer {
		if (!TsServer.instance) {
			const tsconfigInfo = getTsconfigInfoOrThrow()
			TsServer.instance = new TsServer(tsconfigInfo)
		}
		return TsServer.instance
	}

	getVirtualEnv(resolvedTsPaths: string[]) {
		if (this.virtualEnv) {
			return this.virtualEnv
		}

		const programFilePaths = ts.parseJsonConfigFileContent(
			this.tsConfigInfo.compilerOptions,
			ts.sys,
			dirname(this.tsConfigInfo.path)
		).fileNames

		this.programFilePaths = programFilePaths.filter((path) =>
			path.startsWith(fromCwd())
		)

		return tsvfs.createVirtualTypeScriptEnvironment(
			ts.sys,
			[...resolvedTsPaths, ...this.programFilePaths],
			ts,
			this.tsConfigInfo.compilerOptions
		)
	}

	getSourceFileOrThrow(path: string) {
		const fileKey = getFileKey(path)
		const file = this.virtualEnv.getSourceFile(fileKey)
		if (!file) {
			throw new Error(`Could not find ${fileKey}.`)
		}
		return file
	}

	getNodeFromPosition = (
		node: ts.Node,
		position: number
	): ts.CallExpression | undefined => {
		let possibleCallExpressionNode: ts.CallExpression | undefined = undefined

		const iterateThroughChildren = (currentNode: ts.Node): void => {
			if (currentNode.pos <= position && currentNode.end >= position) {
				if (ts.isCallExpression(currentNode)) {
					possibleCallExpressionNode = currentNode
				}
				ts.forEachChild(currentNode, iterateThroughChildren)
			}
		}

		iterateThroughChildren(node)
		if (!possibleCallExpressionNode) {
			throw new Error(
				`Unable to find node at given position ${position} in ${
					node.getSourceFile().fileName
				}`
			)
		}
		return possibleCallExpressionNode
	}
}

export type TypeData = {
	location: LinePositionRange
	type: {
		actual: string
		expected?: string
		equivalent?: boolean
	}
	errors: string
}

export const getAbsolutePosition = (
	file: ts.SourceFile,
	position: SourcePosition
) => {
	const pos = ts.getPositionOfLineAndCharacter(
		file,
		// TS uses 0-based line and char #s
		position.line - 1,
		position.char - 1
	)
	if (!pos) {
		throw new Error(
			`Absolute position was not able to be found in ${file.fileName}`
		)
	}
	return pos
}

export type TsconfigInfo = {
	path: string
	compilerOptions: ts.CompilerOptions
}

export const getTsconfigInfoOrThrow = () => {
	const path = ts.findConfigFile(fromCwd(), ts.sys.fileExists, "tsconfig.json")
	if (!path) {
		throw new Error(`Could not find tsconfig.json.`)
	}
	const compilerOptions = ts.convertCompilerOptionsFromJson(
		ts.readConfigFile(path, ts.sys.readFile).config.compilerOptions,
		path
	).options
	return { path, compilerOptions }
}

export const getTsLibFiles = (tsconfigOptions: ts.CompilerOptions) => {
	const defaultMapFromNodeModules =
		tsvfs.createDefaultMapFromNodeModules(tsconfigOptions)
	const libPath = dirname(ts.getDefaultLibFilePath(tsconfigOptions))
	return {
		defaultMapFromNodeModules,
		resolvedPaths: [...defaultMapFromNodeModules.keys()].map((path) =>
			join(libPath, path)
		)
	}
}

export const getFileFromVirtualEnv = (path: string) => {
	return TsServer.getInstance().virtualEnv.getSourceFile(path)!
}

export const getProgram = (env?: tsvfs.VirtualTypeScriptEnvironment) =>
	env?.languageService.getProgram() ??
	TsServer.getInstance().virtualEnv.languageService.getProgram()

export const getSourceFile = (path: string) =>
	TsServer.getInstance().getSourceFileOrThrow(path)

export const getNodeFromPosition = (file: ts.SourceFile, position: number) =>
	TsServer.getInstance().getNodeFromPosition(file, position)!
