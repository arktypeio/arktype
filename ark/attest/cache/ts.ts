import { fromCwd, readFile, type SourcePosition } from "@ark/fs"
import { printable, throwError, throwInternalError, type dict } from "@ark/util"
import * as tsvfs from "@typescript/vfs"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import ts from "typescript"
import { getConfig } from "../config.ts"

export class TsServer {
	rootFiles!: string[]
	virtualEnv!: tsvfs.VirtualTypeScriptEnvironment
	program!: ts.Program

	private static _instance: TsServer | null = null
	static get instance(): TsServer {
		return new TsServer()
	}

	private tsConfigInfo!: TsconfigInfo

	constructor(tsConfigInfo?: TsconfigInfo) {
		if (TsServer._instance) return TsServer._instance

		this.tsConfigInfo = tsConfigInfo ?? getTsConfigInfoOrThrow()

		const tsLibPaths = getTsLibFiles(this.tsConfigInfo.parsed.options)

		// TS represents windows paths as `C:/Users/ssalb/...`
		const normalizedCwd = fromCwd().replaceAll("\\", "/")

		this.rootFiles = this.tsConfigInfo.parsed.fileNames.filter(path => {
			if (!path.startsWith(normalizedCwd)) return

			// exclude empty files as they lead to a crash
			// when createVirtualTypeScriptEnvironment is called
			const contents = readFile(path).trim()

			return contents !== ""
		})

		const system = tsvfs.createFSBackedSystem(
			tsLibPaths.defaultMapFromNodeModules,
			this.tsConfigInfo.path ? dirname(this.tsConfigInfo.path) : fromCwd(),
			ts
		)

		this.virtualEnv = tsvfs.createVirtualTypeScriptEnvironment(
			system,
			this.rootFiles,
			ts,
			this.tsConfigInfo.parsed.options
		)

		this.program = this.virtualEnv.languageService.getProgram()!

		TsServer._instance = this
	}

	getSourceFileOrThrow(path: string): ts.SourceFile {
		const tsPath = path.replaceAll("\\", "/")
		const existingFile = this.virtualEnv.getSourceFile(tsPath)
		if (existingFile) return existingFile

		if (!this.virtualEnv.sys.fileExists(tsPath)) {
			throwInternalError(
				`@ark/attest: TypeScript was unable to resolve expected file at ${tsPath}.\n`
			)
		}

		const contents = this.virtualEnv.sys.readFile(tsPath)

		if (!contents) {
			throwInternalError(
				`@ark/attest: TypeScript says a file exists at ${tsPath}, but was unable to read its contents.\n`
			)
		}

		this.virtualEnv.createFile(tsPath, contents)

		const createdFile = this.virtualEnv.getSourceFile(tsPath)

		if (!createdFile) {
			throwInternalError(
				`@ark/attest: TypeScript tried to create a file at ${tsPath} but was unable to access it.`
			)
		}

		return createdFile
	}
}

export const nearestCallExpressionChild = (
	node: ts.Node,
	position: number
): ts.CallExpression => {
	const result = nearestBoundingCallExpression(node, position)
	if (!result) {
		throwInternalError(
			`Unable to find bounding call expression at position ${position} in ${
				node.getSourceFile().fileName
			}`
		)
	}
	return result
}

export const nearestBoundingCallExpression = (
	node: ts.Node,
	position: number
): ts.CallExpression | undefined =>
	node.pos <= position && node.end >= position ?
		(node
			.getChildren()
			.flatMap(
				child => nearestBoundingCallExpression(child, position) ?? []
			)[0] ?? (ts.isCallExpression(node) ? node : undefined))
	:	undefined

export const getAbsolutePosition = (
	file: ts.SourceFile,
	position: SourcePosition
): number => {
	const pos = ts.getPositionOfLineAndCharacter(
		file,
		// TS uses 0-based line and char #s
		position.line - 1,
		position.char - 1
	)
	if (!pos) {
		throwInternalError(
			`Absolute position ${printable(position)} does not exist in ${file.fileName}`
		)
	}
	return pos
}

export type TsconfigInfo = {
	path: string | undefined
	parsed: ts.ParsedCommandLine
}

export const getTsConfigInfoOrThrow = (): TsconfigInfo => {
	const config = getConfig()
	const tsconfig = config.tsconfig

	let instantiatedConfig: ts.ParsedCommandLine | undefined
	let configFilePath: string | undefined

	if (tsconfig !== null) {
		configFilePath =
			tsconfig ??
			ts.findConfigFile(fromCwd(), ts.sys.fileExists, "tsconfig.json")
		if (configFilePath)
			instantiatedConfig = instantiateTsconfigFromPath(configFilePath)
	}

	instantiatedConfig ??= instantiateNoFileConfig()

	return {
		path: configFilePath,
		parsed: instantiatedConfig
	}
}

type RawTsConfigJson = dict & { compilerOptions: ts.CompilerOptions }

type InstantiatedTsConfigJson = ts.ParsedCommandLine

const instantiateNoFileConfig = (): InstantiatedTsConfigJson => {
	const arkConfig = getConfig()

	const instantiatedConfig = ts.parseJsonConfigFileContent(
		{
			compilerOptions: arkConfig.compilerOptions
		},
		ts.sys,
		fromCwd()
	)

	if (instantiatedConfig.errors.length > 0)
		throwConfigInstantiationError(instantiatedConfig)

	return instantiatedConfig
}

const instantiateTsconfigFromPath = (
	path: string
): InstantiatedTsConfigJson => {
	const arkConfig = getConfig()
	const configFileText = readFileSync(path).toString()
	const result = ts.parseConfigFileTextToJson(path, configFileText)
	if (result.error) throwConfigParseError(result.error)

	const rawConfig: RawTsConfigJson = result.config

	rawConfig.compilerOptions = Object.assign(
		rawConfig.compilerOptions ?? {},
		arkConfig.compilerOptions
	)

	const instantiatedConfig = ts.parseJsonConfigFileContent(
		rawConfig,
		ts.sys,
		dirname(path),
		{},
		path
	)

	if (instantiatedConfig.errors.length > 0)
		throwConfigInstantiationError(instantiatedConfig)

	return instantiatedConfig
}

const defaultDiagnosticHost: ts.FormatDiagnosticsHost = {
	getCanonicalFileName: fileName => fileName,
	getCurrentDirectory: process.cwd,
	getNewLine: () => ts.sys.newLine
}

const throwConfigParseError = (error: ts.Diagnostic) =>
	throwError(ts.formatDiagnostics([error], defaultDiagnosticHost))

const throwConfigInstantiationError = (
	instantiatedConfig: InstantiatedTsConfigJson
): never =>
	throwError(
		ts.formatDiagnostics(instantiatedConfig.errors, defaultDiagnosticHost)
	)

type TsLibFiles = {
	defaultMapFromNodeModules: Map<string, string>
	resolvedPaths: string[]
}

export const getTsLibFiles = (
	tsconfigOptions: ts.CompilerOptions
): TsLibFiles => {
	const defaultMapFromNodeModules =
		tsvfs.createDefaultMapFromNodeModules(tsconfigOptions)
	const libPath = dirname(ts.getDefaultLibFilePath(tsconfigOptions))
	return {
		defaultMapFromNodeModules,
		resolvedPaths: [...defaultMapFromNodeModules.keys()].map(path =>
			join(libPath, path)
		)
	}
}

export const getProgram = (
	env?: tsvfs.VirtualTypeScriptEnvironment
): ts.Program =>
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
): InternalTypeChecker =>
	getProgram(env).getTypeChecker() as InternalTypeChecker

export interface StringifiableType extends ts.Type {
	toString(): string
	isUnresolvable: boolean
}

export const getStringifiableType = (node: ts.Node): StringifiableType => {
	const typeChecker = getInternalTypeChecker()
	const nodeType = typeChecker.getTypeAtLocation(node)

	let stringified = typeChecker.typeToString(nodeType)

	if (stringified.includes("...")) {
		const nonTruncated = typeChecker.typeToString(
			nodeType,
			undefined,
			ts.TypeFormatFlags.NoTruncation
		)

		stringified =
			nonTruncated.includes(" any") && !stringified.includes(" any") ?
				nonTruncated.replaceAll(" any", " cyclic")
			:	nonTruncated
	}

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
	args: call.arguments.map(arg => getStringifiableType(arg)),
	typeArgs:
		call.typeArguments?.map(typeArg => getStringifiableType(typeArg)) ?? []
})

export const getDescendants = (node: ts.Node): ts.Node[] =>
	getDescendantsRecurse(node)

const getDescendantsRecurse = (node: ts.Node): ts.Node[] => [
	node,
	...node.getChildren().flatMap(child => getDescendantsRecurse(child))
]

export const getAncestors = (node: ts.Node): ts.Node[] => {
	const ancestors: ts.Node[] = []
	let baseNode = node.parent
	while (baseNode.parent !== undefined) {
		ancestors.push(baseNode)
		baseNode = baseNode.parent
	}
	return ancestors
}

export const getFirstAncestorByKindOrThrow = (
	node: ts.Node,
	kind: ts.SyntaxKind
): ts.Node =>
	getAncestors(node).find(ancestor => ancestor.kind === kind) ??
	throwInternalError(
		`Could not find an ancestor of kind ${ts.SyntaxKind[kind]}`
	)
