import { getRegex } from "../../utils/regexCache.js"
import { hasType } from "../../utils/typeOf.js"
import type { KeyIntersection } from "./intersection.js"

export type RegexAttribute = string | readonly string[]

export const checkRegex = (data: string, regex: RegexAttribute) =>
    typeof regex === "string"
        ? checkRegexExpression(data, regex)
        : regex.every((regexSource) => checkRegexExpression(data, regexSource))

const checkRegexExpression = (data: string, regexSource: string) =>
    getRegex(regexSource).test(data)

export const regexIntersection: KeyIntersection<RegexAttribute> = (l, r) => {
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
