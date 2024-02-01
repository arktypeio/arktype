import { fromCwd, type SourcePosition } from "@arktype/fs"
import * as tsvfs from "@typescript/vfs"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import ts from "typescript"

export class TsServer {
	rootFiles!: string[]
	virtualEnv!: tsvfs.VirtualTypeScriptEnvironment

	static #instance: TsServer | null = null
	static get instance() {
		return new TsServer()
	}

	private constructor(private tsConfigInfo = getTsConfigInfoOrThrow()) {
		if (TsServer.#instance) {
			return TsServer.#instance
		}
		const tsLibPaths = getTsLibFiles(tsConfigInfo.parsed.options)

		this.rootFiles = tsConfigInfo.parsed.fileNames.filter((path) =>
			path.startsWith(fromCwd())
		)

		const system = tsvfs.createFSBackedSystem(
			tsLibPaths.defaultMapFromNodeModules,
			dirname(this.tsConfigInfo.path),
			ts
		)

		this.virtualEnv = tsvfs.createVirtualTypeScriptEnvironment(
			system,
			this.rootFiles,
			ts,
			this.tsConfigInfo.parsed.options
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
	parsed: ts.ParsedCommandLine
}

// export const getTsConfigInfoOrThrow = () => {
// 	const path = ts.findConfigFile(fromCwd(), ts.sys.fileExists, "tsconfig.json")
// 	if (!path) {
// 		throw new Error(`Could not find tsconfig.json.`)
// 	}
// 	const compilerOptions = ts.convertCompilerOptionsFromJson(
// 		ts.readConfigFile(path, ts.sys.readFile).config.compilerOptions,
// 		path
// 	).options
// 	return { path, compilerOptions }
// }

export const getTsConfigInfoOrThrow = (): TsconfigInfo => {
	const configFilePath = ts.findConfigFile(
		"./",
		ts.sys.fileExists,
		"tsconfig.json"
	)
	if (!configFilePath) {
		throw new Error(`File ${join(fromCwd(), "tsconfig.json")} must exist.`)
	}

	const configFileText = readFileSync(configFilePath).toString()
	const result = ts.parseConfigFileTextToJson(configFilePath, configFileText)
	if (result.error) {
		throw new Error(
			ts.formatDiagnostics([result.error], {
				getCanonicalFileName: (fileName) => fileName,
				getCurrentDirectory: process.cwd,
				getNewLine: () => ts.sys.newLine
			})
		)
	}

	const configObject = result.config
	const configParseResult = ts.parseJsonConfigFileContent(
		configObject,
		ts.sys,
		dirname(configFilePath),
		{},
		configFilePath
	)

	if (configParseResult.errors.length > 0) {
		throw new Error(
			ts.formatDiagnostics(configParseResult.errors, {
				getCanonicalFileName: (fileName) => fileName,
				getCurrentDirectory: process.cwd,
				getNewLine: () => ts.sys.newLine
			})
		)
	}

	return {
		path: configFilePath,
		parsed: configParseResult
	}
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

export interface InternalTypeChecker extends ts.TypeChecker {
	// These APIs are not publicly exposed
	getInstantiationCount: () => number
	isTypeAssignableTo: (source: ts.Type, target: ts.Type) => boolean
	getDiagnostics: () => ts.Diagnostic[]
}

export const getInternalTypeChecker = (
	env?: tsvfs.VirtualTypeScriptEnvironment
) => getProgram(env).getTypeChecker() as InternalTypeChecker

export interface StringifiableType extends ts.Type {
	toString(): string
	isUnresolvable: boolean
}

export const getStringifiableType = (node: ts.Node): StringifiableType => {
	const typeChecker = getInternalTypeChecker()
	// in a call like attest<object>({a: true}),
	// passing arg.expression avoids inferring {a: true} as object
	const nodeType = typeChecker.getTypeAtLocation(node)
	const stringified = typeChecker.typeToString(nodeType)
	return Object.assign(nodeType, {
		toString: () => stringified,
		isUnresolvable: (nodeType as any).intrinsicName === "error"
	})
}

export type ArgumentTypes = {
	args: StringifiableType[]
	typeArgs: StringifiableType[]
}

export const extractArgumentTypesFromCall = (
	call: ts.CallExpression
): ArgumentTypes => ({
	args: call.arguments.map((arg) => getStringifiableType(arg)),
	typeArgs:
		call.typeArguments?.map((typeArg) => getStringifiableType(typeArg)) ?? []
})

export const getDescendants = (node: ts.Node): ts.Node[] =>
	getDescendantsRecurse(node)

const getDescendantsRecurse = (node: ts.Node): ts.Node[] => [
	node,
	...node.getChildren().flatMap((child) => getDescendantsRecurse(child))
]

export const getAncestors = (node: ts.Node) => {
	const ancestors: ts.Node[] = []
	while (node.parent) {
		ancestors.push(node)
		node = node.parent
	}
	return ancestors
}
