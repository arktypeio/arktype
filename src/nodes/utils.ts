import type { Segments } from "../utils/paths.js"

export const compilePathAccess = (segments: Segments, result = "data") => {
    for (const segment of segments) {
        result += compilePropAccess(segment)
    }
    return result
}

export const compilePropAccess = (key: string | number) => {
    if (typeof key === "number") {
        return `[${key}]`
    }
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(key)
        ? `.${key}`
        : `[${/^\$\{.*\}$/.test(key) ? key.slice(2, -1) : JSON.stringify(key)}]`
}
