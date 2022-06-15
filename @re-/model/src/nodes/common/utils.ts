import { toString } from "@re-/tools"

/**
 *  Can be used to allow arbitrarily chained property access.
 *  This is useful for expressions whose meaning is not attached to a value,
 *  e.g. to allow the extraction of types using typeof without depending on
 *  the existence of a real object that conforms to that type's structure:
 *
 * @example
 * const myType: MyType = chainableNoOpProxy
 *
 * // The following types are equivalent
 * type ExtractedType = typeof myType.a.b.c
 * type DirectlyExtractedType = MyType["a"]["b"]["c"]
 */
export const chainableNoOpProxy: any = new Proxy(
    {},
    { get: () => chainableNoOpProxy }
)

export const pathAdd = (...subpaths: (string | number)[]) =>
    subpaths.filter((_) => _ !== "").join("/")

export const stringifyDef = (def: unknown) =>
    toString(def, { quotes: "none", maxNestedStringLength: 50 })

export const stringifyValue = (value: unknown) =>
    toString(value, {
        maxNestedStringLength: 50
    })

export const stringifyPathContext = (path: string) =>
    path ? ` at path ${path}` : ""

export class PathMap<T> extends Map<string, T> {
    getUnder(path: string) {
        const results: Record<string, T> = {}
        for (const [pathToCheck, data] of this.entries()) {
            if (pathToCheck.startsWith(path)) {
                results[path] = data
            }
        }
        return results
    }

    deleteUnder(path: string) {
        for (const k of this.keys()) {
            if (k.startsWith(path)) {
                this.delete(k)
            }
        }
    }

    setUnder(path: string, dataByRelativePath: Record<string, T>) {
        this.deleteUnder(path)
        for (const [pathToSet, data] of Object.entries(dataByRelativePath)) {
            this.set(pathToSet, data)
        }
    }
}

export class ErrorsByPath extends PathMap<string> {
    toString() {
        let formattedMessage = ""
        if (this.size === 1) {
            const [path, message] = this.entries()
            if (path) {
                formattedMessage += `At path ${path}, `
            }
            formattedMessage += message
        } else if (this.size > 1) {
            formattedMessage += "Encountered errors at the following paths:\n"
            for (const [path, message] of this.entries()) {
                formattedMessage += `  ${path}: ${message}\n`
            }
        }
        return formattedMessage
    }
}
