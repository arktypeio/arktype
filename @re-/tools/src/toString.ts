import { isRecursible } from "./common.js"

export type ToStringOptions = {
    indent?: number
    quotes?: keyof typeof quoteTypes
    quoteKeys?: boolean
    maxNestedStringLength?: number
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
            if (typeof value === "string") {
                let formattedStringValue: string = value
                if (
                    options.maxNestedStringLength &&
                    formattedStringValue.length > options.maxNestedStringLength
                ) {
                    formattedStringValue =
                        formattedStringValue.slice(
                            0,
                            options.maxNestedStringLength - 1
                        ) + "..."
                }
                result += `${quote}${formattedStringValue}${quote}`
            } else if (typeof value === "bigint") {
                result += `${value}n`
            } else {
                result += String(value)
            }
        } else if (seen.includes(value)) {
            result += "(cyclic value)"
        } else {
            result += Array.isArray(value)
                ? `[${beforeRecurse}${value
                      .map((v) => recurse(v, [...seen, value], depth + 1, null))
                      .join(valueSeperator)}${afterRecurse}]`
                : `{${beforeRecurse}${Reflect.ownKeys(value)
                      .map(
                          (k) =>
                              `${recurse(
                                  value[k],
                                  [...seen, value],
                                  depth + 1,
                                  String(k)
                              )}`
                      )
                      .join(valueSeperator)}${afterRecurse}}`
        }
        return indent + result
    }
    return recurse(value, [], 0, null)
}
