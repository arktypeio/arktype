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
