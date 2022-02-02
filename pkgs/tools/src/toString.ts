import { isRecursible } from "./common.js"

export type ToStringOptions = {
    indent?: number
    quotes?: keyof typeof quoteTypes
    quoteKeys?: boolean
}

export const quoteTypes = {
    single: "'",
    double: '"',
    backtick: "`",
    none: ""
}

export const print = (value: any, options: ToStringOptions = {}) => {
    console.log(toString(value, options))
}

export const toString = (value: any, options: ToStringOptions = {}) => {
    const quote = quoteTypes[options.quotes ?? "single"]
    const keyQuote = options.quoteKeys ? quote : ""
    const valueSeperator = options.indent ? ",\n" : ", "
    const recurse = (
        value: any,
        seen: any[],
        depth: number,
        key: string | null
    ): string => {
        const indent = options.indent ? " ".repeat(options.indent * depth) : ""
        const beforeRecurse = options.indent ? "\n" : ""
        const afterRecurse = options.indent ? `\n${indent}` : ""
        let result = ""
        if (key) {
            result += `${keyQuote}${key}${keyQuote}: `
        }
        if (!isRecursible(value)) {
            result +=
                typeof value === "string"
                    ? `${quote}${value}${quote}`
                    : typeof value === "bigint"
                    ? `${value}n`
                    : String(value)
        } else if (seen.includes(value)) {
            result += "(cyclic value)"
        } else {
            if (Array.isArray(value)) {
                result += `[${beforeRecurse}${value
                    .map((v) => recurse(v, [...seen, value], depth + 1, null))
                    .join(valueSeperator)}${afterRecurse}]`
            } else {
                result += `{${beforeRecurse}${Object.entries(value)
                    .map(
                        ([k, v]) =>
                            `${recurse(v, [...seen, value], depth + 1, k)}`
                    )
                    .join(valueSeperator)}${afterRecurse}}`
            }
        }
        return indent + result
    }
    return recurse(value, [], 0, null)
}
