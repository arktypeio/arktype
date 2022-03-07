import { IncludesSubstring } from "@re-/tools"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    ModifierToken,
    modifierTokenMatcher,
    CheckModifier,
    UnknownTypeError
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Optional } from "./optional.js"

export namespace Modifier {
    export type Definition = `${string}${ModifierToken}${string}`

    export type Check<
        Def extends Definition,
        Root extends string,
        Space
    > = IncludesSubstring<Def, "?"> extends true
        ? CheckModifier<"?", Def, Root, Space>
        : UnknownTypeError<Def>

    export type Parse<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = Def extends Optional.Definition<infer Inner>
        ? Fragment.Parse<Inner, Space, Options> | undefined
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            children: () => [Optional.delegate]
        },
        {
            matches: (def) => !!def.match(modifierTokenMatcher)
        }
    )

    export const delegate = parse as any as Definition
}
