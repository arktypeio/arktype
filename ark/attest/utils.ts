import { caller } from "@arktype/fs"
import { basename, relative } from "node:path"

export const getFileKey = (path: string): string => relative(".", path)

/**
 *  Can be used to allow arbitrarily chained property access and function calls.
 */
export const chainableNoOpProxy: any = new Proxy(() => chainableNoOpProxy, {
	get: () => chainableNoOpProxy
})

export type ContextualizeBlock = {
	(tests: () => void): void
	(nameA: string, testsA: () => void): void
	(nameA: string, testsA: () => void, nameB: string, testsB: () => void): void
	(
		nameA: string,
		testsA: () => void,
		nameB: string,
		testsB: () => void,
		nameC: string,
		testsC: () => void
	): void
	(
		nameA: string,
		testsA: () => void,
		nameB: string,
		testsB: () => void,
		nameC: string,
		testsC: () => void,
		nameD: string,
		testsD: () => void
	): void
	(
		nameA: string,
		testsA: () => void,
		nameB: string,
		testsB: () => void,
		nameC: string,
		testsC: () => void,
		nameD: string,
		testsD: () => void,
		nameE: string,
		testsE: () => void
	): void
	(
		nameA: string,
		testsA: () => void,
		nameB: string,
		testsB: () => void,
		nameC: string,
		testsC: () => void,
		nameD: string,
		testsD: () => void,
		nameE: string,
		testsE: () => void,
		nameF: string,
		testsF: () => void
	): void
}

export const contextualize: ContextualizeBlock = (...args: any[]) => {
	const describe = globalThis.describe
	if (!describe) {
		throw new Error(
			`contextualize cannot be used without a global 'describe' function.`
		)
	}

	const fileName = basename(caller().file)
	if (typeof args[0] === "function") describe(fileName, args[0])
	else {
		describe(fileName, () => {
			for (let i = 0; i < args.length; i = i + 2) describe(args[i], args[i + 1])
		})
	}
}
