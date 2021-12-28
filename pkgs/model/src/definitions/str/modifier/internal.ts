import { ElementOf, IncludesSubstring, Iteration, narrow } from "@re-/tools"
import {
    createTokenMatcher,
    DuplicateModifierError,
    InvalidModifierError
} from "./internal.js"
import { Modifier } from "./modifier.js"

export * from "../internal.js"

export const modifierTokens = narrow(["?", ":"])

export const modifierTokenMatcher = createTokenMatcher(modifierTokens)

export type ModifierTokens = typeof modifierTokens

export type ModifierToken = ElementOf<ModifierTokens>

type AvailableModifierStrings<
    Tokens extends string[],
    Result extends string = ""
> = Tokens extends Iteration<string, infer Token, infer Remaining>
    ? Remaining extends []
        ? `${Result}${Token | ""}`
        : `${Result}${Token | ""}${AvailableModifierStrings<Remaining>}`
    : never

export type ModifierString = Exclude<
    AvailableModifierStrings<ModifierTokens>,
    ""
>

export type CheckModifier<
    Token extends ModifierToken,
    Def extends string,
    Root extends string,
    Space
> = Def extends `${infer Modified}${Token}${Token extends ":" ? string : ""}`
    ? IncludesSubstring<Modified, Token> extends true
        ? DuplicateModifierError<Token>
        : Modifier.Check<Modified, Root, Space>
    : InvalidModifierError<Token>
