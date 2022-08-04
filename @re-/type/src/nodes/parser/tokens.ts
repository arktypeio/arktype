import { Evaluate, Narrow } from "@re-/tools"

export type TokenSet = Record<string, 1>

export const tokens = <T extends TokenSet>(tokenSet: Narrow<T>) =>
    tokenSet as Evaluate<T>

export const enclosedBaseStartChars = tokens({
    "'": 1,
    '"': 1,
    "/": 1
})

export type EnclosedBaseStartChar = keyof typeof enclosedBaseStartChars

export const boundStartChars = tokens({
    "<": 1,
    ">": 1,
    "=": 1
})

export const boundTokens = tokens({
    "<": 1,
    ">": 1,
    ">=": 1,
    "<=": 1,
    "==": 1
})

export const baseTerminatingChars = tokens({
    ...boundStartChars,
    END: 1,
    "?": 1,
    "|": 1,
    "&": 1,
    "(": 1,
    ")": 1,
    "[": 1,
    " ": 1
})

export type BaseTerminatingChar = keyof typeof baseTerminatingChars

export const suffixTokens = tokens({
    ...boundTokens,
    END: 1,
    "?": 1
})

export type ErrorToken<Message extends string> = `!${Message}`

export type SuffixToken = keyof typeof suffixTokens

// The operator tokens that are exactly one character and are not the first character of a longer token
export const trivialSingleCharOperators = {
    "|": 1,
    "&": 1,
    "?": 1,
    ")": 1,
    END: 1
}

export type TrivialSingleCharOperator = keyof typeof trivialSingleCharOperators
