import { fromCwd, writeFile } from "@ark/fs"
import { throwError, throwInternalError } from "@ark/util"
import { existsSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import type * as tsgoAst from "typescript/unstable/ast"
import type * as tsgoApi from "typescript/unstable/sync"
import type { LinePositionRange } from "../cache/getCachedAssertions.ts"
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

	private api: tsgoApi.API
	private contentsByPath = new Map<string, string>()

	private static _instance: TsgoServer | null = null
	static get instance(): TsgoServer {
		return (TsgoServer._instance ??= new TsgoServer())
	}

	private constructor() {
		this.api = new API({
			cwd: fromCwd(),
			fs: { readFile: path => this.contentsByPath.get(path) }
		})
		this.configPath = getProjectConfigPath()
		this.project = this.openProject()

		const configErrors = this.project.program.getConfigFileParsingDiagnostics()
		if (configErrors.length)
			throwError(configErrors.map(error => error.text).join("\n"))

		const normalizedCwd = fromCwd().replace(/\\/g, "/")
		this.rootFiles = this.project.rootFiles.filter(path =>
			path.startsWith(normalizedCwd)
		)

		// tsgo only reports diagnostics after applying @ts-expect-error and
		// @ts-ignore, so they're disabled without shifting any positions
		for (const path of this.rootFiles) {
			const contents = disableCommentDirectives(this.getSourceFileOrThrow(path))
			if (contents !== undefined) this.contentsByPath.set(path, contents)
		}
		if (this.contentsByPath.size)
			this.project = this.openProject([...this.contentsByPath.keys()])
	}

	getSourceFileOrThrow(path: string): SourceFile {
		const normalizedPath = path.replace(/\\/g, "/")
		return (
			this.project.program.getSourceFile(normalizedPath) ??
			// files outside the project, e.g. benches excluded by tsconfig
			(existsSync(normalizedPath) ?
				this.api
					.updateSnapshot({ openFiles: [normalizedPath] })
					.getDefaultProjectForFile(normalizedPath)
					?.program.getSourceFile(normalizedPath)
			:	undefined) ??
			throwInternalError(
				`@ark/attest: TypeScript was unable to resolve expected file at ${path}.`
			)
		)
	}

	private openProject(changed?: string[]): Project {
		return (
			this.api
				.updateSnapshot(
					changed ?
						{ openProjects: [this.configPath], fileChanges: { changed } }
					:	{ openProjects: [this.configPath] }
				)
				.getProject(this.configPath) ??
			throwInternalError(`@ark/attest: Unable to load ${this.configPath}`)
		)
	}
}

/**
 * tsgo only loads projects from config files, so attest's compilerOptions are
 * applied by a config written beside the base config, which keeps relative
 * paths and ${configDir} resolving exactly as they would from the base config
 */
const getProjectConfigPath = (): string => {
	const { tsconfig, compilerOptions } = getConfig()
	const baseConfigPath =
		tsconfig === null ? undefined
		: tsconfig === undefined ? findTsconfig(fromCwd())
		: resolve(tsconfig)
	if (baseConfigPath && !Object.keys(compilerOptions).length)
		return baseConfigPath

	return writeTempTsconfig(
		join(
			baseConfigPath ? dirname(baseConfigPath) : fromCwd(),
			`.attest-${process.pid}.tsconfig.json`
		),
		{ extends: baseConfigPath, compilerOptions }
	)
}

const findTsconfig = (fromDir: string): string | undefined => {
	const path = join(fromDir, "tsconfig.json")
	if (existsSync(path)) return path
	const parentDir = dirname(fromDir)
	return parentDir === fromDir ? undefined : findTsconfig(parentDir)
}

const singleLineDirective = /^\/\/\/?\s*@ts-(?:expect-error|ignore)/
const multiLineDirective = /^[*/]*\s*@ts-(?:expect-error|ignore)/

const literalKinds = (): ReadonlySet<tsgoAst.SyntaxKind> =>
	new Set([
		ast.SyntaxKind.StringLiteral,
		ast.SyntaxKind.NoSubstitutionTemplateLiteral,
		ast.SyntaxKind.TemplateHead,
		ast.SyntaxKind.TemplateMiddle,
		ast.SyntaxKind.TemplateTail,
		ast.SyntaxKind.RegularExpressionLiteral,
		ast.SyntaxKind.JsxText
	])

/**
 * Returns the file's text with each comment TS would treat as a directive
 * changed from @ts- to @ts_, or undefined if it has none
 */
const disableCommentDirectives = (file: SourceFile): string | undefined => {
	const text = file.getFullText()
	if (!text.includes("@ts-")) return

	const kinds = literalKinds()
	const literalEnds = new Map<number, number>()
	for (const node of getDescendants(file))
		if (kinds.has(node.kind)) literalEnds.set(node.getStart(), node.end)

	const chars = text.split("")
	let changed = false
	const disable = (lineStart: number, line: string, directive: RegExp) => {
		const trimmed = line.trimStart()
		if (!directive.test(trimmed)) return
		const trimmedStart = lineStart + line.length - trimmed.length
		chars[trimmedStart + trimmed.indexOf("@ts-") + 3] = "_"
		changed = true
	}

	for (let i = 0; i < text.length; i++) {
		const literalEnd = literalEnds.get(i)
		if (literalEnd !== undefined) i = literalEnd - 1
		else if (text.startsWith("//", i)) {
			const lineEnd = text.indexOf("\n", i)
			const commentEnd = lineEnd === -1 ? text.length : lineEnd
			disable(i, text.slice(i, commentEnd), singleLineDirective)
			i = commentEnd
		} else if (text.startsWith("/*", i)) {
			const closeStart = text.indexOf("*/", i + 2)
			const commentEnd = closeStart === -1 ? text.length : closeStart + 2
			// like TS, only the last line of a block comment can be a directive
			const lastLineStart = Math.max(
				i,
				text.lastIndexOf("\n", commentEnd - 1) + 1,
				text.lastIndexOf("\r", commentEnd - 1) + 1
			)
			disable(
				lastLineStart,
				text.slice(lastLineStart, commentEnd),
				multiLineDirective
			)
			i = commentEnd - 1
		}
	}
	return changed ? chars.join("") : undefined
}

const tempPaths = new Set<string>()

const removeTempPaths = () => {
	for (const path of tempPaths) rmSync(path, { force: true })
	tempPaths.clear()
}

let isCleanupRegistered = false

/**
 * Written beside sources so relative paths resolve the same way, and removed
 * at exit, including when the process is interrupted
 */
export const writeTempFile = (path: string, contents: string): string => {
	if (!isCleanupRegistered) {
		isCleanupRegistered = true
		process.on("exit", removeTempPaths)
		for (const signal of ["SIGINT", "SIGTERM"] as const) {
			process.once(signal, () => {
				removeTempPaths()
				// exit as the signal would have unless the host handles it
				if (!process.listenerCount(signal)) process.kill(process.pid, signal)
			})
		}
	}
	tempPaths.add(path)
	writeFile(path, contents)
	return path
}

export const writeTempTsconfig = (path: string, config: object): string =>
	writeTempFile(path, JSON.stringify(config, null, 4))

export const removeTempFile = (path: string): void => {
	rmSync(path, { force: true })
	tempPaths.delete(path)
}

export const getDescendants = (node: Node): Node[] => {
	const descendants: Node[] = []
	const collect = (descendant: Node) => {
		descendants.push(descendant)
		descendant.forEachChild(collect)
	}
	collect(node)
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
