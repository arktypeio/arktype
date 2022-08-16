import { Evaluate, Narrow } from "@re-/tools"

export type TokenSet = Record<string, 1>

export const tokenSet = <T extends TokenSet>(tokenSet: Narrow<T>) =>
    tokenSet as Evaluate<T>

export const inTokenSet = <Set extends TokenSet>(
    token: string,
    set: Set
): token is Extract<keyof Set, string> => token in set

export const enclosedBaseStartChars = tokenSet({
    "'": 1,
    '"': 1,
    "/": 1
})

export type EnclosedBaseStartChar = keyof typeof enclosedBaseStartChars

export const boundChars = tokenSet({
    "<": 1,
    ">": 1,
    "=": 1
})

export const boundTokens = tokenSet({
    "<": 1,
    ">": 1,
    ">=": 1,
    "<=": 1,
    "==": 1
})

export const baseTerminatingChars = tokenSet({
    ...boundChars,
    "?": 1,
    "|": 1,
    "&": 1,
    ")": 1,
    "[": 1,
    " ": 1
})

export type BaseTerminatingChar = keyof typeof baseTerminatingChars

export const suffixTokens = tokenSet({
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
