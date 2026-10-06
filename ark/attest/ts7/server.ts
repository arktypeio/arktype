import { fromCwd, writeFile } from "@ark/fs"
import { throwError, throwInternalError } from "@ark/util"
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs"
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
	private snapshot: tsgoApi.Snapshot | undefined
	private contentsByPath = new Map<string, string>()
	private filesOutsideProject = new Map<string, SourceFile | undefined>()

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
	}

	/**
	 * tsgo only reports diagnostics after applying @ts-expect-error and
	 * @ts-ignore, so they're disabled in root files without shifting positions
	 */
	disableCommentDirectives(): void {
		if (this.contentsByPath.size) return
		for (const path of this.rootFiles) {
			// avoid transferring the AST of a file that can't contain one
			if (!readFileSync(path, "utf8").includes("@ts-")) continue
			const contents = getTextWithoutCommentDirectives(
				this.getSourceFileOrThrow(path)
			)
			if (contents !== undefined) this.contentsByPath.set(path, contents)
		}
		if (this.contentsByPath.size)
			this.project = this.openProject([...this.contentsByPath.keys()])
	}

	/** the node's text as written, before any directives were disabled */
	getOriginalText(node: Node): string {
		const path = node.getSourceFile().fileName
		return this.contentsByPath.has(path) ?
				readFileSync(path, "utf8").slice(node.getStart(), node.end)
			:	node.getText()
	}

	getSourceFileOrThrow(path: string): SourceFile {
		const normalizedPath = path.replace(/\\/g, "/")
		return (
			this.project.program.getSourceFile(normalizedPath) ??
			this.getFileOutsideProject(normalizedPath) ??
			throwInternalError(
				`@ark/attest: TypeScript was unable to resolve expected file at ${path}.`
			)
		)
	}

	// e.g. benches excluded by tsconfig, which are only read for their syntax
	private getFileOutsideProject(path: string): SourceFile | undefined {
		if (!this.filesOutsideProject.has(path) && existsSync(path)) {
			const snapshot = this.api.updateSnapshot({ openFiles: [path] })
			this.filesOutsideProject.set(
				path,
				snapshot.getDefaultProjectForFile(path)?.program.getSourceFile(path)
			)
			snapshot.dispose()
		}
		return this.filesOutsideProject.get(path)
	}

	private openProject(changed?: string[]): Project {
		const snapshot = this.api.updateSnapshot(
			changed ?
				{ openProjects: [this.configPath], fileChanges: { changed } }
			:	{ openProjects: [this.configPath] }
		)
		this.snapshot?.dispose()
		this.snapshot = snapshot
		return (
			snapshot.getProject(this.configPath) ??
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

// tsgo's grammar, which unlike TS 5 allows any number of leading slashes but
// only spaces and tabs as whitespace
const singleLineDirective = /^\/{2,}[ \t]*@ts-(?:expect-error|ignore)/
const multiLineDirective = /^[ \t]*[*/]*[ \t]*@ts-(?:expect-error|ignore)/
const lineBreak = /[\n\r\u2028\u2029]/g

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
 * Returns the file's text with each comment tsgo would treat as a directive
 * changed from @ts- to @ts_, or undefined if it has none
 */
const getTextWithoutCommentDirectives = (
	file: SourceFile
): string | undefined => {
	const text = file.getFullText()
	const kinds = literalKinds()
	const literalEnds = new Map<number, number>()
	for (const node of getDescendants(file)) {
		if (kinds.has(node.kind)) {
			// JsxText has no trivia, so its leading whitespace is part of it
			literalEnds.set(
				ast.isJsxText(node) ? node.pos : node.getStart(),
				node.end
			)
		}
	}

	const chars = text.split("")
	let changed = false
	const disable = (start: number, end: number, directive: RegExp) => {
		const comment = text.slice(start, end)
		if (!directive.test(comment)) return
		chars[start + comment.indexOf("@ts-") + 3] = "_"
		changed = true
	}

	for (let i = 0; i < text.length; i++) {
		const literalEnd = literalEnds.get(i)
		if (literalEnd !== undefined && literalEnd > i) i = literalEnd - 1
		else if (text.startsWith("//", i)) {
			lineBreak.lastIndex = i
			const commentEnd = lineBreak.exec(text)?.index ?? text.length
			disable(i, commentEnd, singleLineDirective)
			i = commentEnd
		} else if (text.startsWith("/*", i)) {
			const closeStart = text.indexOf("*/", i + 2)
			const commentEnd = closeStart === -1 ? text.length : closeStart + 2
			// only the last line of a block comment can be a directive
			let lastLineStart = i
			lineBreak.lastIndex = i
			while (lineBreak.exec(text) && lineBreak.lastIndex <= commentEnd)
				lastLineStart = lineBreak.lastIndex
			disable(lastLineStart, commentEnd, multiLineDirective)
			i = commentEnd - 1
		}
	}
	return changed ? chars.join("") : undefined
}

const tempPaths = new Set<string>()

process.on("exit", () => {
	for (const path of tempPaths) rmSync(path, { force: true })
})

const cleanedDirs = new Set<string>()

// a process that was killed couldn't remove its own temp files
const removeStaleTempFiles = (dir: string) => {
	if (cleanedDirs.has(dir)) return
	cleanedDirs.add(dir)
	for (const name of readdirSync(dir)) {
		const pid = /^\.attest-(\d+)[-.]/.exec(name)?.[1]
		if (pid && !isRunning(Number(pid))) rmSync(join(dir, name), { force: true })
	}
}

const isRunning = (pid: number): boolean => {
	try {
		process.kill(pid, 0)
		return true
	} catch (e) {
		// the process exists but belongs to another user
		return (e as NodeJS.ErrnoException).code === "EPERM"
	}
}

/**
 * Written beside sources so relative paths resolve the same way, and removed
 * at exit or by the next process to write to the same directory
 */
export const writeTempFile = (path: string, contents: string): string => {
	removeStaleTempFiles(dirname(path))
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
