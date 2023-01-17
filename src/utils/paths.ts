import type { conform, downcast, List, NonEmptyList } from "./generics"

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
    delimiter = "/",
    // temporary workaround for inability to infer narrowed List<string>
    segments = path as List<string>
) =>
    `${base}${
        segments.length ? ` at ${segments.join(delimiter)}` : ""
    }` as withPathContext<base, conform<path, List<string>>>

export type withPathContext<
    base extends string,
    path extends List<string>,
    delimiter extends string = "/"
> = `${base}${path extends NonEmptyList ? ` at ${join<path, delimiter>}` : ""}`
