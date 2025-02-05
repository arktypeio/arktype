import {
	cpSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { dirname, join, parse } from "node:path"
import * as process from "node:process"
import { URL, fileURLToPath } from "node:url"
import { caller } from "./caller.ts"
import { getShellOutput } from "./shell.ts"
export { rmSync } from "node:fs"

export const ensureDir = (path: string): string => {
	if (existsSync(path)) {
		if (!statSync(path).isDirectory())
			throw new Error(`${path} exists and is not a directory.`)
	} else mkdirSync(path, { recursive: true })

	return path
}

export const readFile = (path: string): string => readFileSync(path).toString()

export const writeFile = (path: string, contents: string): string => {
	writeFileSync(path, contents)
	return contents
}

export const rewriteFile = (
	path: string,
	transform: (contents: string) => string
): string => writeFile(path, transform(readFile(path)))

export const readJson = (path: string): Record<string, unknown> =>
	JSON.parse(readFileSync(path, { encoding: "utf8" }))

export const writeJson = (path: string, data: object): void =>
	writeFileSync(path, `${JSON.stringify(data, null, 4)}\n`)

export type JsonTransformer = (data: object) => object

export const rewriteJson = (
	path: string,
	transform: (data: object) => object
): void => writeJson(path, transform(readJson(path)))

export const rmRf = (target: string): void =>
	rmSync(target, { recursive: true, force: true })

export const cpR = (from: string, to: string): void =>
	cpSync(from, to, { recursive: true, force: true })

export type WalkOptions = {
	ignoreDirsMatching?: RegExp
	ignoreFilesMatching?: RegExp
	excludeFiles?: boolean
	excludeDirs?: boolean
	exclude?: (path: string) => boolean
	include?: (path: string) => boolean
}

export const walkPaths = (dir: string, options: WalkOptions = {}): string[] =>
	readdirSync(dir).reduce((paths: string[], item: string) => {
		const path = join(dir, item)
		const isDir = lstatSync(path).isDirectory()
		const isFile = lstatSync(path).isFile()
		if (isDir && options.ignoreDirsMatching?.test(path)) return paths

		if (isFile && options.ignoreFilesMatching?.test(path)) return paths

		const excludeCurrent =
			(options.excludeDirs && isDir) ||
			(options.excludeFiles && !isDir) ||
			options.exclude?.(path) ||
			(options.include && !options.include(path))
		const nestedPaths = isDir ? walkPaths(path, options) : []
		paths.push(...(excludeCurrent ? [] : [path]), ...nestedPaths)
		return paths
	}, [])

/** Fetch the file and directory paths from a path, uri, or `import.meta.url` */
export const filePath = (path: string): string => {
	let file: string
	if (path.includes("://")) {
		// is a url, e.g. file://, or https://
		const url = new URL(path)
		file = url.protocol === "file:" ? fileURLToPath(url) : url.href
	} else {
		// is already a typical path
		file = path
	}
	return file
}

const fileOfCaller = () =>
	filePath(caller({ methodName: "fileOfCaller", upStackBy: 1 }).file)

const dirOfCaller = () =>
	dirname(filePath(caller({ methodName: "dirOfCaller", upStackBy: 1 }).file))

export const fileName = (): string => fileOfCaller()

export const dirName = (): string => dirOfCaller()

export const fromHere = (...joinWith: string[]): string =>
	join(dirOfCaller(), ...joinWith)

export const fromCwd = (...joinWith: string[]): string =>
	join(process.cwd(), ...joinWith)

export const fromHome = (...joinWith: string[]): string =>
	join(homedir()!, ...joinWith)

export const fsRoot: string = parse(process.cwd()).root

export const findPackageRoot = (fromDir?: string): string | null => {
	const startDir = fromDir ?? dirOfCaller()
	let dirToCheck = startDir
	while (dirToCheck !== fsRoot) {
		try {
			const contents = readJson(join(dirToCheck, "package.json"))
			/*
			 * If the file is just a stub with no package name, don't consider
			 * it a package root
			 */
			if ("name" in contents) return dirToCheck
		} catch {
			// If the file doesn't exist, go up another level
		}
		dirToCheck = join(dirToCheck, "..")
	}
	return null
}

export const assertPackageRoot = (fromDir?: string): string => {
	const startDir = fromDir ?? dirOfCaller()
	const result = findPackageRoot(fromDir)
	if (result) return result

	throw new Error(`${startDir} is not part of a node package.`)
}

export const findPackageAncestors = (fromDir?: string): string[] => {
	const dirs: string[] = []

	let dir: string | null = fromDir ?? dirOfCaller()

	while (dir) {
		dir = findPackageRoot(dir)
		if (dir) {
			dirs.push(dir)
			dir = join(dir, "..")
		}
	}

	return dirs
}

export const readPackageJsonAncestors = (fromDir?: string): any[] =>
	findPackageAncestors(fromDir).map(dir => readPackageJson(dir))

export const fromPackageRoot = (...joinWith: string[]): string =>
	join(assertPackageRoot(dirOfCaller()), ...joinWith)

export const readPackageJson = (startDir = dirOfCaller()): any =>
	readJson(join(assertPackageRoot(startDir), "package.json"))

export const getSourceControlPaths = (): string[] =>
	// include tracked and untracked files as long as they are not ignored
	getShellOutput("git ls-files --exclude-standard --cached --others")
		.split("\n")
		.filter(path => existsSync(path) && statSync(path).isFile())

export const tsFileMatcher: RegExp = /^.*\.(c|m)?tsx?$/

const inFileFilter: WalkOptions = {
	include: path => tsFileMatcher.test(path),
	ignoreDirsMatching: /node_modules|out|dist|docgen/
}

export const getSourceFilePaths = (dir = "."): string[] =>
	walkPaths(dir, inFileFilter)

export type SourceFileEntry = [path: string, contents: string]

export const getSourceFileEntries = (dir = "."): SourceFileEntry[] =>
	getSourceFilePaths(dir).map(path => [path, readFile(path)])

export type ReplacementDictionary = Record<
	string,
	{ pattern: RegExp; replacement: `"${string}"` }
>
export type Matchers = ReadonlyArray<Matcher>
export type Matcher = {
	pattern: RegExp
	replacement: string
}

/**
 * Given a set of {@link Matchers} and an input string,
 * replace all will replace
 */
const findReplace: (matchers: Matchers) => (input: string) => string =
	matchers => input =>
		matchers.reduce((acc, m) => acc.replaceAll(m.pattern, m.replacement), input)

/**
 * Applies a set of {@link Matchers} to a list of files and rewrites
 * each file's contents according to the provided `Matcher["find"]`
 * and `Matcher["replace"]`.
 */
const findReplaceMany =
	(matchers: Matchers) =>
	(files: readonly string[] = []): void =>
		void files.forEach(file => {
			writeFile(file, findReplace(matchers)(readFile(file)))
		})

/**
 * Given a directory and a set of {@link Matchers}, recursively walks
 * the directory and applies every set of changes in the dictionary
 * to all files except those matching `ignoreFilesMatching`.
 */
export const findReplaceAll =
	(matchDictionary: ReplacementDictionary, ignoreFilesMatching: RegExp) =>
	(dirPath: string): void => {
		const files = walkPaths(dirPath, {
			excludeDirs: true,
			ignoreFilesMatching
		})

		const matchers: Matchers = Object.values(matchDictionary)
		findReplaceMany(matchers)(files)
	}
