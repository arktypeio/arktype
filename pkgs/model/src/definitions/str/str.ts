import {
    ElementOf,
    Iteration,
    ListPossibleTypes,
    narrow,
    RemoveSpaces,
    Split,
    Spliterate
} from "@re-/tools"
import { Root } from "../root.js"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    ReferencesTypeConfig,
    ValidationErrorMessage,
    createTokenMatcher
} from "./internal.js"
import { Fragment } from "./fragment.js"
import { expressionTokens } from "./expression/internal.js"
import { modifierTokens } from "./modifier/internal.js"

export namespace Str {
    export type Definition = string

    export type Format<Def extends string> = RemoveSpaces<Def>

    export type Check<Def extends string, Space> = Fragment.Check<
        Format<Def>,
        Def,
        Space
    >

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Str.Check<Def, Space> extends ValidationErrorMessage
        ? unknown
        : Fragment.Parse<Format<Def>, Space, Options>

    const nonIdentifyingTokens = narrow([
        ...expressionTokens,
        ...modifierTokens
    ])

    const nonIdentifyingTokenMatcher = createTokenMatcher(nonIdentifyingTokens)

    export type NonIdentifyingTokens = typeof nonIdentifyingTokens

    export type References<
        Def extends string,
        Config extends ReferencesTypeConfig
    > = Spliterate<Def, NonIdentifyingTokens, Config>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [Fragment.delegate]
        },
        {
            matches: (def) => typeof def === "string",
            // Split by control characters, then remove
            // empty strings leaving aliases and builtins behind
            references: ({ def }) =>
                def
                    .split(nonIdentifyingTokenMatcher)
                    .filter((fragment) => fragment !== "")
        }
    )

    export const delegate = parse as any as Definition
}
