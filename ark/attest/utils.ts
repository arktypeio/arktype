import { caller } from "@ark/fs"
import { throwError } from "@ark/util"
import { existsSync } from "node:fs"
import { basename, relative, resolve } from "node:path"
import ts from "typescript"

/** TypeScript 7+ is native and only exposes its API via tsgo's IPC client */
export const isTs7: boolean = Number.parseInt(ts.version) >= 7

export const getFileKey = (path: string): string => relative(".", path)

const testFilePattern = /\.test\.[cm]?[jt]sx?$/

/**
 * Narrows the files whose assertions are analyzed to the test files named on
 * the command line, e.g. `pnpm testFiles ark/type/__tests__/brand.test.ts`,
 * since those are the only tests that will run. Analysis cost scales with the
 * files analyzed, so one file takes seconds where the whole project takes
 * minutes. With no test file named, every root file is analyzed as before.
 *
 * A test that runs without having been analyzed fails with "Found no assertion
 * data", so a narrowing that missed a file can never pass silently.
 */
export const narrowToNamedTestFiles = (rootFiles: string[]): string[] => {
	const named = new Set(
		process.argv
			.slice(2)
			.filter(arg => testFilePattern.test(arg) && existsSync(arg))
			.map(arg => resolve(arg).replace(/\\/g, "/"))
	)
	if (!named.size) return rootFiles
	const narrowed = rootFiles.filter(path => named.has(path))
	return narrowed.length ? narrowed : rootFiles
}

/**
 *  Can be used to allow arbitrarily chained property access and function calls.
 */
export const chainableNoOpProxy: any = new Proxy(() => chainableNoOpProxy, {
	get: () => chainableNoOpProxy
})

export type ContextualTests<ctx = unknown> = (
	it: (name: string, test: (ctx: ctx) => void) => void
) => void

export type ContextualizeRoot = {
	// if this unused ctx type is removed, TS can no longer infer the overloads
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	<ctx>(tests: () => void, createCtx?: never): void
	<ctx>(createCtx: () => ctx, tests: ContextualTests<ctx>): void
}

export type ContextualizeEach = <ctx>(
	name: string,
	createCtx: () => ctx,
	tests: ContextualTests<ctx>
) => void

export interface Contextualize extends ContextualizeRoot {
	each: ContextualizeEach
}

const testDirName = "__tests__"
const testSuffix = ".test.ts"

const contextualizeRoot: ContextualizeRoot = (first, contextualTests) => {
	const describe = globalThis.describe
	if (!describe) {
		throw new Error(
			`contextualize cannot be used without a global 'describe' function.`
		)
	}
	const filePath = caller().file
	const testsDirChar = filePath.search(testDirName)
	const suiteNamePath =
		testsDirChar === -1 ?
			basename(filePath)
		:	filePath.slice(testsDirChar + testDirName.length + 1)
	const suiteName = suiteNamePath.slice(0, -testSuffix.length)
	if (contextualTests) {
		describe(suiteName, () =>
			contextualTests((name, test) => {
				it(name, () => test(first() as never))
			})
		)
	} else describe(suiteName, first)
}

const contextualizeEach: ContextualizeEach = (name, createCtx, tests) => {
	const describe = globalThis.describe
	if (!describe) throwNoDescribeError()

	describe(name, () =>
		tests((name, test) => {
			it(name, () => test(createCtx()))
		})
	)
}

export const contextualize: Contextualize = Object.assign(contextualizeRoot, {
	each: contextualizeEach
})

const throwNoDescribeError = () =>
	throwError(
		"contextualize cannot be used without a global 'describe' function."
	)
