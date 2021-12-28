import { ElementOf, Iteration, narrow } from "@re-/tools"
import { createTokenMatcher } from "../internal.js"

export * from "../internal.js"

export const modifierTokens = narrow(["?", ":"])

export const modifierTokenMatcher = createTokenMatcher(modifierTokens)

export type ModifierTokens = typeof modifierTokens

export type ModifierToken = ElementOf<ModifierTokens>

type BuildModifierString<
    Tokens extends string[],
    Result extends string = ""
> = Tokens extends Iteration<string, infer Token, infer Remaining>
    ? Remaining extends []
        ? `${Result}${Token | ""}`
        : `${Result}${Token | ""}${BuildModifierString<Remaining>}`
    : never

export type ModifierString = Exclude<BuildModifierString<ModifierTokens>, "">
