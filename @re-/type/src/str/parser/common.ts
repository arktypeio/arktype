export * from "../common.js"
import { tokenSet } from "./scanner.js"

export const comparators = tokenSet({
    "<": 1,
    ">": 1,
    "<=": 1,
    ">=": 1,
    "==": 1
})

export type Comparator = keyof typeof comparators

export const suffixTokens = tokenSet({
    ...comparators,
    END: 1,
    "?": 1
})

export type SuffixToken = keyof typeof suffixTokens
