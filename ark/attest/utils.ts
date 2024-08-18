import { caller } from "@ark/fs"
import { throwError } from "@ark/util"
import { basename, relative } from "node:path"

export const getFileKey = (path: string): string => relative(".", path)

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
		:	filePath.slice(testsDirChar + testDirName.length)
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
