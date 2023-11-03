import { relative } from "node:path"
import { type Digit } from "@arktype/util"
import ts from "typescript"

export const getFileKey = (path: string) => relative(".", path)

export const getTsVersionUnderTest = (): `${Digit}.${Digit}` =>
	ts.versionMajorMinor

/**
 *  Can be used to allow arbitrarily chained property access and function calls.
 */
export const chainableNoOpProxy: any = new Proxy(() => chainableNoOpProxy, {
	get: () => chainableNoOpProxy
})
