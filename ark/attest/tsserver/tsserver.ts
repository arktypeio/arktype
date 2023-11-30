import { fromCwd, type SourcePosition } from "@arktype/fs"
import * as tsvfs from "@typescript/vfs"
import { dirname, join } from "node:path"
import ts from "typescript"
export class TsServer {
	programFilePaths!: string[]
	virtualEnv!: tsvfs.VirtualTypeScriptEnvironment

	static #instance: TsServer | null = null
	static get instance() {
		return new TsServer()
	}

	private constructor(private tsConfigInfo = getTsConfigInfoOrThrow()) {
		if (TsServer.#instance) {
			return TsServer.#instance
		}
		const tsLibPaths = getTsLibFiles(tsConfigInfo.compilerOptions)

		this.programFilePaths = ts
			.parseJsonConfigFileContent(
				this.tsConfigInfo.compilerOptions,
				ts.sys,
				dirname(this.tsConfigInfo.path)
			)
			.fileNames.filter((path) => path.startsWith(fromCwd()))

		const system = tsvfs.createFSBackedSystem(
			tsLibPaths.defaultMapFromNodeModules,
			dirname(this.tsConfigInfo.path),
			ts
		)

		this.virtualEnv = tsvfs.createVirtualTypeScriptEnvironment(
			system,
			this.programFilePaths,
			ts,
			this.tsConfigInfo.compilerOptions
		)

		TsServer.#instance = this
	}

	getSourceFileOrThrow(path: string) {
		const file = this.virtualEnv.getSourceFile(path)
		if (!file) {
			throw new Error(`Could not find ${path}.`)
		}
		return file
	}
}

export const nearestCallExpressionChild = (
	node: ts.Node,
	position: number
): ts.CallExpression => {
	const result = nearestBoundingCallExpression(node, position)
	if (!result) {
		throw new Error(
			`Unable to find bounding call expression at position ${position} in ${
				node.getSourceFile().fileName
			}`
		)
	}
	return result
}

const nearestBoundingCallExpression = (
	node: ts.Node,
	position: number
): ts.CallExpression | undefined =>
	node.pos <= position && node.end >= position
		? node
				.getChildren()
				.flatMap(
					(child) => nearestBoundingCallExpression(child, position) ?? []
				)[0] ?? (ts.isCallExpression(node) ? node : undefined)
		: undefined

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

export const getTsConfigInfoOrThrow = () => {
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

export const getProgram = (env?: tsvfs.VirtualTypeScriptEnvironment) =>
	env?.languageService.getProgram() ??
	TsServer.instance.virtualEnv.languageService.getProgram()!
