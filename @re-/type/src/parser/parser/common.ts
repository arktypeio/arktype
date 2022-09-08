export * from "../common.js"
import { scanner } from "./scanner.js"

export const comparators = scanner.tokens({
    "<": 1,
    ">": 1,
    "<=": 1,
    ">=": 1,
    "==": 1
})

export type Comparator = keyof typeof comparators

export const suffixTokens = scanner.tokens({
    ...comparators,
    END: 1,
    "?": 1
})

export type SuffixToken = keyof typeof suffixTokens
