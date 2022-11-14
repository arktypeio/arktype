export const pushKey = (path: string, key: string, delimiter = ".") =>
    path === "" ? key : `${path}${delimiter}${key}`

export const withoutLastKey = (path: string, delimiter = ".") => {
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

export const pathToSegments = (path: string, delimiter = ".") =>
    path === "" ? [] : path.split(delimiter)
