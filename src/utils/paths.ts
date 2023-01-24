import type { List } from "./generics"

export type Path = `/${string}`

export type pushKey<path extends Path, key extends string> = path extends "/"
    ? `/${key}`
    : `${path}/${key}`

export const pushKey = <path extends Path, key extends string>(
    path: path,
    key: key
) =>
    ((path as Path) === "/" ? `/${key}` : `${path}/${key}`) as pushKey<
        path,
        key
    >

export const popKey = (path: Path): [remaining: Path, popped: string] => {
    const lastDelimiterIndex = path.lastIndexOf("/")
    return [
        (path.slice(0, lastDelimiterIndex) || "/") as Path,
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

export type pathToString<
    segments extends List<string>,
    result extends Path = "/"
> = segments extends [infer head extends string, ...infer tail extends string[]]
    ? pathToString<tail, pushKey<result, head>>
    : result

export const pathPrefix = <path extends string>(path: path) =>
    (path === ("/" as Path) ? "" : `At ${path}: `) as pathPrefix<path>

export type pathPrefix<path extends string> = path extends "/"
    ? ""
    : `At ${path}: `
