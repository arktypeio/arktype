import type { keySet } from "../utils/generics.js"
import { composePredicateIntersection, equal } from "./compose.js"

// import { getRegex } from "../utils/regexCache.js"
// export const checkRegex = (data: string, regex: RegexAttribute) =>
//     typeof regex === "string"
//         ? checkRegexExpression(data, regex)
//         : regex.every((regexSource) => checkRegexExpression(data, regexSource))

// export const checkRegexExpression = (data: string, regexSource: string) =>
//     getRegex(regexSource).test(data)

export type CollapsibleKeyset = string | keySet

export const collapsibleKeysetIntersection =
    composePredicateIntersection<CollapsibleKeyset>((l, r) => {
        if (typeof l === "string") {
            if (typeof r === "string") {
                return l === r ? equal : { [l]: true, [r]: true }
            }
            return r[l] ? r : { ...r, [l]: true }
        }
        if (typeof r === "string") {
            return l[r] ? l : { ...l, [r]: true }
        }
        return { ...l, ...r }
    })
