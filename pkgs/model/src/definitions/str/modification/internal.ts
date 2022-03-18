export * from "../internal.js"

import { Iteration } from "@re-/tools"

type ModifierTokens = ["?"]

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
