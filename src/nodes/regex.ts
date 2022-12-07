import { getRegex } from "../utils/regexCache.js"
import type { IntersectionReducer } from "./intersection.js"

export type RegexAttribute = string | readonly string[]

export const checkRegex = (data: string, regex: RegexAttribute) =>
    typeof regex === "string"
        ? checkRegexExpression(data, regex)
        : regex.every((regexSource) => checkRegexExpression(data, regexSource))

const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export const regexIntersection: IntersectionReducer<RegexAttribute> = (
    l,
    r
) => {
    if (typeof l === "string") {
        if (typeof r === "string") {
            return l === r ? undefined : [l, r]
        }
        return r.includes(l) ? r : [...r, l]
    }
    if (typeof r === "string") {
        return l.includes(r) ? l : [...l, r]
    }
    const result = [...l]
    for (const expression of r) {
        if (!l.includes(expression)) {
            result.push(expression)
        }
    }
    return result.length === l.length
        ? result.length === r.length
            ? undefined
            : l
        : result.length === r.length
        ? r
        : result
}
