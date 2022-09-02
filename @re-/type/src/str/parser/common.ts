export * from "../common.js"
import { comparators } from "../operator/bound/common.js"
import { tokenSet } from "./scanner.js"

export const suffixTokens = tokenSet({
    ...comparators,
    END: 1,
    "?": 1
})

export type SuffixToken = keyof typeof suffixTokens
