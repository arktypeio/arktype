import type { List } from "./generics"

export const pushKey = (path: string, key: string, delimiter = "/") =>
    path === "" ? key : `${path}${delimiter}${key}`

export const popKey = (
    path: string,
    delimiter = "/"
): [remaining: string, removed: string | undefined] => {
    const lastDelimiterIndex = path.lastIndexOf(delimiter)
    return lastDelimiterIndex === -1
        ? ["", undefined]
        : [
              path.slice(0, lastDelimiterIndex),
              path.slice(lastDelimiterIndex + 1)
          ]
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

export const describePath = <path extends string>(path: path) =>
    path && (` at ${path}` as describePath<path>)

export type describePath<path extends string> = path extends ""
    ? ""
    : ` at ${path}`
