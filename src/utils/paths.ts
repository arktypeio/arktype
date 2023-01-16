import type { downcast, List } from "./generics"

export const pushKey = (path: string, key: string, delimiter = "/") =>
    path === "" ? key : `${path}${delimiter}${key}`

export const withoutLastKey = (path: string, delimiter = "/") => {
    const lastDelimiterIndex = path.lastIndexOf(delimiter)
    return lastDelimiterIndex === -1 ? "" : path.slice(0, lastDelimiterIndex)
}

export const getPath = (value: unknown, path: string[]): unknown => {
    let result: any = value
    for (const segment of path) {
        if (typeof result !== "object" || result === null) {
            return undefined
        }
        result = result[segment]
    }
    return result
}

export const pathToSegments = (path: string, delimiter = "/") =>
    path === "" ? [] : path.split(delimiter)

export type join<
    segments extends List<string>,
    delimiter extends string = "/",
    result extends string = ""
> = segments extends [infer head extends string, ...infer tail extends string[]]
    ? join<
          tail,
          delimiter,
          result extends "" ? head : `${result}${delimiter}${head}`
      >
    : result

export const withPathContext = <base extends string, path>(
    base: base,
    path: downcast<path>,
    delimiter = "/"
): withPathContext<base, path> =>
    `${base}${
        (path as string[]).length
            ? ` at ${(path as string[]).join(delimiter)}`
            : ("" as any)
    }`

export type withPathContext<
    base extends string,
    path,
    delimiter extends string = "/"
> = `${base}${path extends [string, ...string[]]
    ? ` at ${join<path, delimiter>}`
    : ""}`
