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
    "?": 1,
    "%": 1
})

export type SuffixToken = keyof typeof suffixTokens

export type OneCharSuffixToken = "?" | "%" | "<" | ">" | "END"

export type TwoCharSuffixToken = "<=" | ">=" | "=="

export type InvalidSuffixMessage<
    LastValidSuffixToken extends SuffixToken,
    Unscanned extends string,
    ExpectedFollowingTokenDescription extends string = ""
> = `Suffix ${LastValidSuffixToken} must be followed by${ExpectedFollowingTokenDescription extends ""
    ? ""
    : ` ${ExpectedFollowingTokenDescription} and`} zero or more additional suffix tokens (got '${Unscanned}').`

export const invalidSuffixMessage = <
    Token extends SuffixToken,
    Unscanned extends string,
    ExpectedFollowingTokenDescription extends string
>(
    lastValidSuffixToken: Token,
    unscanned: Unscanned,
    expectedFollowingTokenDescription?: ExpectedFollowingTokenDescription
): InvalidSuffixMessage<Token, Unscanned, ExpectedFollowingTokenDescription> =>
    `Suffix ${lastValidSuffixToken} must be followed by${
        (expectedFollowingTokenDescription
            ? ` ${expectedFollowingTokenDescription} and`
            : "") as any
    } zero or more additional suffix tokens (got '${unscanned}').`
