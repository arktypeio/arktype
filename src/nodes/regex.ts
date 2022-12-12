import { listIntersection } from "../utils/generics.js"
import { getRegex } from "../utils/regexCache.js"
import { composePredicateIntersection, equivalence } from "./compose.js"

export type RegexAttribute = string | readonly string[]

export const checkRegex = (data: string, regex: RegexAttribute) =>
    typeof regex === "string"
        ? checkRegexExpression(data, regex)
        : regex.every((regexSource) => checkRegexExpression(data, regexSource))

const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export const regexIntersection = composePredicateIntersection<RegexAttribute>(
    (l, r) => {
        if (typeof l === "string") {
            if (typeof r === "string") {
                return l === r ? equivalence : [l, r]
            }
            return r.includes(l) ? r : [...r, l]
        }
        if (typeof r === "string") {
            return l.includes(r) ? l : [...l, r]
        }
        const result = listIntersection(l, r)
        return result.length === l.length
            ? result.length === r.length
                ? equivalence
                : l
            : result.length === r.length
            ? r
            : result
    }
)
