import { relative } from "node:path"
import { ts } from "ts-morph"

export const positionToString = (position: SourcePosition) =>
	`line ${position.line}, character ${position.char} at path '${position.file}'`

export const getFileKey = (path: string) => relative(".", path)

export const getTsVersionUnderTest = (): "4.8" | "4.9" | "5.0" | "5.1" =>
	ts.versionMajorMinor

/**
 *  Can be used to allow arbitrarily chained property access and function calls.
 */
export const chainableNoOpProxy: any = new Proxy(() => chainableNoOpProxy, {
	get: () => chainableNoOpProxy
})
