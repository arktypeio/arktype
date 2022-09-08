export * from "../common.js"
import { comparatorChars } from "../../operator/bound/common.js"
import { Parser } from "../common.js"

export const baseTerminatingChars = Parser.tokenSet({
    ...comparatorChars,
    "?": 1,
    "|": 1,
    "&": 1,
    ")": 1,
    "[": 1,
    " ": 1
})

export type BaseTerminatingChar = keyof typeof baseTerminatingChars
