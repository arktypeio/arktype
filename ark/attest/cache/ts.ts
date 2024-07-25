import { fromCwd, type SourcePosition } from "@ark/fs"
import { throwInternalError } from "@ark/util"
import prettier from "@prettier/sync"
import * as tsvfs from "@typescript/vfs"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { Options as PrettierOptions } from "prettier"
import ts from "typescript"
import { getConfig } from "../config.js"

export class TsServer {
	rootFiles!: string[]
	virtualEnv!: tsvfs.VirtualTypeScriptEnvironment
	program!: ts.Program

	private static _instance: TsServer | null = null
	static get instance(): TsServer {
		return new TsServer()
	}

	private constructor(private tsConfigInfo = getTsConfigInfoOrThrow()) {
		if (TsServer._instance) return TsServer._instance

		const tsLibPaths = getTsLibFiles(tsConfigInfo.parsed.options)

		// TS represents windows paths as `C:/Users/ssalb/...`
		const normalizedCwd = fromCwd().replaceAll(/\\/g, "/")

		this.rootFiles = tsConfigInfo.parsed.fileNames.filter(path =>
			path.startsWith(normalizedCwd)
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

		this.program = this.virtualEnv.languageService.getProgram()!

		TsServer._instance = this
	}

	getSourceFileOrThrow(path: string): ts.SourceFile {
		const tsPath = path.replaceAll(/\\/g, "/")
		const file = this.virtualEnv.getSourceFile(tsPath)
		if (!file) throw new Error(`Could not find ${path}.`)

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

export const getTsConfigInfoOrThrow = (): TsconfigInfo => {
	const config = getConfig().tsconfig
	const configFilePath =
		config ?? ts.findConfigFile(fromCwd(), ts.sys.fileExists, "tsconfig.json")
	if (!configFilePath) {
		throw new Error(
			`File ${config ?? join(fromCwd(), "tsconfig.json")} must exist.`
		)
	}

	const configFileText = readFileSync(configFilePath).toString()
	const result = ts.parseConfigFileTextToJson(configFilePath, configFileText)
	if (result.error) {
		throw new Error(
			ts.formatDiagnostics([result.error], {
				getCanonicalFileName: fileName => fileName,
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
				getCanonicalFileName: fileName => fileName,
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

const declarationPrefix = "type T = "
const typeFormatOptions: PrettierOptions = {
	parser: "typescript",
	semi: false,
	useTabs: true,
	printWidth: 60,
	trailingComma: "none"
}

const formatTypeString = (typeString: string) =>
	prettier
		.format(`${declarationPrefix}${typeString}`, typeFormatOptions)
		.slice(declarationPrefix.length)
		.trimEnd()

const replaceKnownInvalidSyntax = (typeString: string): string => {
	// Match '...' and '... x more ...' (known truncated type syntax)
	const regex = /\.\.\.\s*(\d+\s*more\s*\.\.\.)?/g

	// replace these with a string literal "..." so that they can still
	// form valid expressions, e.g. "..."[]
	return typeString.replaceAll(regex, '"..."')
}

export const getStringifiableType = (node: ts.Node): StringifiableType => {
	const typeChecker = getInternalTypeChecker()
	const nodeType = typeChecker.getTypeAtLocation(node)
	let stringified = typeChecker.typeToString(nodeType)

	try {
		stringified = formatTypeString(stringified)
	} catch {
		// if formatting fails (e.g. due to custom typeToString syntax like ... X more),
		// try to comment out problematic sections
		try {
			stringified = formatTypeString(replaceKnownInvalidSyntax(stringified))
		} catch {
			// if still fails somehow, just swallow the error and use the unformatted type
		}
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
