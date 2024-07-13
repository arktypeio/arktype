import { caller } from "@arktype/fs"
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

export type ContextualizeBlock = {
	// if this unused ctx type is removed, TS can no longer infer the overloads
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	<ctx>(tests: () => void, createCtx?: never): void
	<ctx>(createCtx: () => ctx, tests: ContextualTests<ctx>): void
}

export const contextualize: ContextualizeBlock = (first, contextualTests) => {
	const describe = globalThis.describe
	if (!describe) {
		throw new Error(
			`contextualize cannot be used without a global 'describe' function.`
		)
	}
	const fileName = basename(caller().file)
	if (contextualTests) {
		describe(fileName, () =>
			contextualTests((name, test) => {
				it(name, () => test(first() as never))
			})
		)
	} else describe(fileName, first)
}
