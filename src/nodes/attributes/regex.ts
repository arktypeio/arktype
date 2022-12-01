import { getRegex } from "../../utils/regexCache.js"
import { hasType } from "../../utils/typeOf.js"
import type { KeyReducer } from "../intersection.js"
import type { Bounds } from "./bounds.js"
import { checkBounds } from "./bounds.js"
import type { LiteralChecker } from "./literals.js"

export type StringAttributes = {
    readonly type: "string"
    readonly literal?: string
    readonly regex?: string | readonly string[]
    readonly bounds?: Bounds
}

export type RegexAttribute = string | readonly string[]

export const checkRegex = (data: string, regex: RegexAttribute) =>
    typeof regex === "string"
        ? checkRegexExpression(data, regex)
        : regex.every((regexSource) => checkRegexExpression(data, regexSource))

const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export const regexIntersection: KeyReducer<StringAttributes, "regex"> = (
    l,
    r
) => {
    if (hasType(l, "string")) {
        if (hasType(r, "string")) {
            return l === r ? l : [l, r]
        }
        return r.includes(l) ? r : [...r, l]
    }
    if (hasType(r, "string")) {
        return l.includes(r) ? l : [...l, r]
    }
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result
}
