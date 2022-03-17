import { RemoveSpaces } from "@re-/tools"
import { Root } from "../root.js"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    ReferencesTypeConfig,
    ValidationErrorMessage
} from "./internal.js"
import { Fragment } from "./fragment/fragment.js"
import { Modifier } from "./modifier/modifier.js"

export namespace Str {
    export type Definition = string

    // TODO: Move formatting
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

    export type References<
        Def extends string,
        Space,
        Config extends ReferencesTypeConfig
    > = []

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [Modifier.delegate, Fragment.delegate]
        },
        {
            matches: (def) => typeof def === "string",
            // TODO: Fix
            references: ({ def }) => [def]
        }
    )

    export const delegate = parse as any as Definition
}
