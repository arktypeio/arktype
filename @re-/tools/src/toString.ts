import { isRecursible } from "./common.js"
import { isAlphaNumeric } from "./stringUtils.js"

export type QuoteType = keyof typeof quoteTypes

export type ToStringOptions = {
    indent?: number
    quote?: QuoteType
    keyQuote?: QuoteType
    nonAlphaNumKeyQuote?: QuoteType
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
    const quote = quoteTypes[options.quote ?? "double"]
    const alphaNumKeyQuote = quoteTypes[options.keyQuote ?? "none"]
    const nonAlphaNumKeyQuote =
        quoteTypes[options.nonAlphaNumKeyQuote ?? options.keyQuote ?? "none"]
    const valueSeperator = options.indent ? ",\n" : ", "
    const recurse = (
        value: unknown,
        seen: any[],
        depth: number,
        key: string | null
    ): string => {
        const indent = options.indent ? " ".repeat(options.indent * depth) : ""
        const beforeRecurse = options.indent ? "\n" : ""
        const afterRecurse = options.indent ? `\n${indent}` : ""
        let result = ""
        if (key) {
            const keyQuote = isAlphaNumeric(key)
                ? alphaNumKeyQuote
                : nonAlphaNumKeyQuote
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
                                  value[k as any],
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
