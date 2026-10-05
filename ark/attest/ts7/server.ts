import { ensureDir, fromCwd, readFile, writeJson } from "@ark/fs"
import { throwInternalError } from "@ark/util"
import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import type * as tsgoAst from "typescript-7/unstable/ast"
import type * as tsgoApi from "typescript-7/unstable/sync"
import type { LinePositionRange } from "../cache/writeAssertionCache.ts"
import { getConfig } from "../config.ts"
import { isTs7 } from "../utils.ts"

// resolved relative to attest so the API matches the installed typescript
const requireTypeScript = createRequire(import.meta.url)

// only loaded for TS 7+ so this module can be imported unconditionally
export const ast: typeof tsgoAst =
	isTs7 ? requireTypeScript("typescript/unstable/ast") : (undefined as never)

const { API }: typeof tsgoApi =
	isTs7 ? requireTypeScript("typescript/unstable/sync") : ({} as never)

export const tscPath: string = join(
	dirname(requireTypeScript.resolve("typescript/package.json")),
	"bin",
	"tsc"
)

export type Node = tsgoAst.Node
export type SourceFile = tsgoAst.SourceFile
export type CallExpression = tsgoAst.CallExpression
export type Project = tsgoApi.Project
export type Type = tsgoApi.Type

export class TsgoServer {
	configPath: string
	project: Project
	rootFiles: string[]

	private static _instance: TsgoServer | null = null
	static get instance(): TsgoServer {
		return (TsgoServer._instance ??= new TsgoServer())
	}

	private constructor() {
		const api = new API({
			cwd: fromCwd(),
			fs: { readFile: readFileWithoutDirectives }
		})
		this.configPath = writeAttestTsconfig(api)
		this.project =
			api
				.updateSnapshot({ openProjects: [this.configPath] })
				.getProject(this.configPath) ??
			throwInternalError(`@ark/attest: Unable to load ${this.configPath}`)
		const normalizedCwd = fromCwd().replace(/\\/g, "/")
		this.rootFiles = this.project.rootFiles.filter(path =>
			path.startsWith(normalizedCwd)
		)
	}

	getSourceFileOrThrow(path: string): SourceFile {
		return (
			this.project.program.getSourceFile(path.replace(/\\/g, "/")) ??
			throwInternalError(
				`@ark/attest: TypeScript was unable to resolve expected file at ${path}.`
			)
		)
	}
}

const directivePattern = /(\/[*/]\s*)@ts-(expect-error|ignore)/g

/**
 * tsgo only reports diagnostics after applying @ts-expect-error and @ts-ignore,
 * so they're disabled without shifting positions to allow asserting on errors
 */
const readFileWithoutDirectives = (path: string): string | undefined => {
	if (path.includes("/node_modules/") || !/\.[cm]?tsx?$/.test(path)) return
	if (!existsSync(path)) return
	const contents = readFile(path)
	const withoutDirectives = contents.replace(directivePattern, "$1@ts_$2")
	return withoutDirectives === contents ? undefined : withoutDirectives
}

/**
 * tsgo only loads projects from config files, so the tsconfig and
 * compilerOptions settings are combined into one under the cache dir
 */
const writeAttestTsconfig = (api: tsgoApi.API): string => {
	const config = getConfig()
	const path = join(ensureDir(config.cacheDir), "tsconfig.json")
	const baseConfigPath =
		config.tsconfig === null ?
			undefined
		:	(config.tsconfig ?? findTsconfig(fromCwd()))
	writeJson(
		path,
		baseConfigPath ?
			{
				extends: baseConfigPath,
				compilerOptions: config.compilerOptions,
				// an inherited default include would be relative to this file
				files: api.parseConfigFile(baseConfigPath).fileNames,
				include: []
			}
		:	{
				compilerOptions: config.compilerOptions,
				include: [fromCwd("**", "*")]
			}
	)
	return path
}

const findTsconfig = (fromDir: string): string | undefined => {
	const path = join(fromDir, "tsconfig.json")
	if (existsSync(path)) return path
	const parentDir = dirname(fromDir)
	return parentDir === fromDir ? undefined : findTsconfig(parentDir)
}

export const getDescendants = (node: Node): Node[] => {
	const descendants: Node[] = [node]
	node.forEachChild(child => {
		descendants.push(...getDescendants(child))
	})
	return descendants
}

export const getAncestors = (node: Node): Node[] => {
	const ancestors: Node[] = []
	let baseNode = node.parent
	while (baseNode?.parent !== undefined) {
		ancestors.push(baseNode)
		baseNode = baseNode.parent
	}
	return ancestors
}

export const getCallExpressionsByName = (
	startNode: Node,
	names: string[]
): CallExpression[] =>
	getDescendants(startNode).filter(
		(node): node is CallExpression =>
			ast.isCallExpression(node) &&
			(!names.length || names.includes(node.expression.getText()))
	)

export const getCallLocation = (call: CallExpression): LinePositionRange => {
	const file = call.getSourceFile()
	const start = file.getLineAndCharacterOfPosition(call.getStart())
	const end = file.getLineAndCharacterOfPosition(call.getEnd())
	// trace positions are 1-based and TS positions are 0-based
	return {
		start: { line: start.line + 1, char: start.character + 1 },
		end: { line: end.line + 1, char: end.character + 1 }
	}
}

export const getFirstFunctionDescendant = (node: Node): Node | undefined =>
	getDescendants(node).find(
		descendant =>
			ast.isArrowFunction(descendant) || ast.isFunctionExpression(descendant)
	)
