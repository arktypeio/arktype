export const pushKey = (path: string, key: string, delimiter = ".") =>
    path === "" ? key : `${path}${delimiter}${key}`

export const withoutLastKey = (path: string, delimiter = ".") => {
    const lastDelimiterIndex = path.lastIndexOf(delimiter)
    return lastDelimiterIndex === -1 ? "" : path.slice(0, lastDelimiterIndex)
}

export const getPath = (
    value: unknown,
    path: string,
    delimiter = "."
): unknown => {
    const segments = path.split(delimiter)
    let result: any = value
    while (typeof result === "object" && result !== null && segments.length) {
        result = result[segments.shift()!]
    }
    return result
}
