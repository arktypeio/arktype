import { fromCwd, writeFile } from "@ark/fs"
import { throwError, throwInternalError, type JsonObject } from "@ark/util"
import { existsSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { threadId } from "node:worker_threads"
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

// unique to this thread, since worker threads share a pid
export const tempId = `${process.pid}-${threadId}`

export type Node = tsgoAst.Node
export type SourceFile = tsgoAst.SourceFile
export type CallExpression = tsgoAst.CallExpression
export type Project = tsgoApi.Project
export type Type = tsgoApi.Type

export class TsgoServer {
	projectConfig: ProjectConfig
	configPath: string
	project: Project
	rootFiles: string[]

	private api: tsgoApi.API
	private generatedConfig: string | undefined
	private snapshot: tsgoApi.Snapshot | undefined
	private contentsByPath = new Map<string, string>()
	private originalTextByPath = new Map<string, string>()
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
		this.projectConfig = getProjectConfig()
		const { extends: baseConfigPath, compilerOptions } = this.projectConfig
		if (baseConfigPath && !Object.keys(compilerOptions).length)
			this.configPath = baseConfigPath
		else {
			this.configPath = join(
				this.projectConfig.dir,
				`.attest-${tempId}.tsconfig.json`
			)
			this.generatedConfig = JSON.stringify(
				{ extends: baseConfigPath, compilerOptions },
				null,
				4
			)
		}
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
			const file = this.getSourceFileOrThrow(path)
			const contents = getTextWithoutCommentDirectives(file)
			if (contents === undefined) continue
			this.originalTextByPath.set(path, file.getFullText())
			this.contentsByPath.set(path, contents)
		}
		if (this.contentsByPath.size)
			this.project = this.openProject([...this.contentsByPath.keys()])
	}

	/** the node's text as written, before any directives were disabled */
	getOriginalText(node: Node): string {
		const text = this.originalTextByPath.get(node.getSourceFile().fileName)
		return text?.slice(node.getStart(), node.end) ?? node.getText()
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
		// tsgo only reads a generated config while loading the project, so it
		// can't be left behind if the process is interrupted
		if (this.generatedConfig) writeFile(this.configPath, this.generatedConfig)
		let snapshot: tsgoApi.Snapshot
		try {
			snapshot = this.api.updateSnapshot(
				changed ?
					{ openProjects: [this.configPath], fileChanges: { changed } }
				:	{ openProjects: [this.configPath] }
			)
		} finally {
			if (this.generatedConfig) rmSync(this.configPath, { force: true })
		}
		this.snapshot?.dispose()
		this.snapshot = snapshot
		return (
			snapshot.getProject(this.configPath) ??
			throwInternalError(`@ark/attest: Unable to load ${this.configPath}`)
		)
	}
}

export type ProjectConfig = {
	/** where attest's configs are written, beside the base config if any */
	dir: string
	extends: string | undefined
	compilerOptions: JsonObject
}

/**
 * tsgo only loads projects from config files, so attest's compilerOptions are
 * applied by configs written beside the base config, which keeps relative
 * paths and ${configDir} resolving exactly as they would from the base config
 */
const getProjectConfig = (): ProjectConfig => {
	const { tsconfig, compilerOptions } = getConfig()
	const baseConfigPath =
		tsconfig === null ? undefined
		: tsconfig === undefined ? findTsconfig(fromCwd())
		: resolve(tsconfig)
	return {
		dir: baseConfigPath ? dirname(baseConfigPath) : fromCwd(),
		extends: baseConfigPath,
		compilerOptions
	}
}

const findTsconfig = (fromDir: string): string | undefined => {
	const path = join(fromDir, "tsconfig.json")
	if (existsSync(path)) return path
	const parentDir = dirname(fromDir)
	return parentDir === fromDir ? undefined : findTsconfig(parentDir)
}

// tsgo's grammar, which unlike TS 5 allows any number of leading slashes but
// only spaces and tabs as whitespace
const singleLineDirective = /^\/{2,}[\t ]*@ts-(?:expect-error|ignore)/
const multiLineDirective = /^[\t ]*[*/]*[\t ]*@ts-(?:expect-error|ignore)/
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
	if (!text.includes("@ts-")) return

	const kinds = literalKinds()
	const literalEnds = new Map<number, number>()
	// like a literal, a shebang line can't contain a comment
	if (text.startsWith("#!")) {
		const shebangEnd = text.search(lineBreak)
		literalEnds.set(0, shebangEnd === -1 ? text.length : shebangEnd)
	}
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
			while (lineBreak.test(text) && lineBreak.lastIndex <= commentEnd)
				lastLineStart = lineBreak.lastIndex
			disable(lastLineStart, commentEnd, multiLineDirective)
			i = commentEnd - 1
		}
	}
	return changed ? chars.join("") : undefined
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
