import { relative } from "node:path"

export const getFileKey = (path: string) => relative(".", path)

/**
 *  Can be used to allow arbitrarily chained property access and function calls.
 */
export const chainableNoOpProxy: any = new Proxy(() => chainableNoOpProxy, {
	get: () => chainableNoOpProxy
})
