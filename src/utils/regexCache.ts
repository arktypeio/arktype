const regexCache: Record<string, RegExp> = {}

export const getRegex = (source: string) => {
    if (!regexCache[source]) {
        regexCache[source] = new RegExp(source)
    }
    return regexCache[source]
}
