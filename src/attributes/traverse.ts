const pushKey = (path: string, key: string, delimiter = ".") =>
    path === "" ? key : `${path}${delimiter}${key}`

const popKey = (path: string, delimiter = ".") => {
    const lastDelimiterIndex = path.lastIndexOf(delimiter)
    return lastDelimiterIndex === -1 ? "" : path.slice(0, lastDelimiterIndex)
}
