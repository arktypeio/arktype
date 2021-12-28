import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ModifierString
} from "./internal.js"
import { Str } from "../str.js"
import { Optional } from "./optional.js"
import { nonIdentifyingTokenMatcher } from "../internal.js"

export namespace Modifier {
    export type Definition = `${string}${ModifierString}${string}`

    export type Check<
        Def extends string,
        Root extends string,
        Space
    > = Def extends Optional.Definition<infer Inner>
        ? Modifier.Check<Inner, Root, Space>
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Def extends Optional.Definition<infer Inner>
        ? Modifier.Parse<Inner, Space, Options> | undefined
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
            children: () => [Optional.delegate]
        },
        {
            // Any string containing a control character will be interpreted as an expression
            matches: (def) => !!def.match(nonIdentifyingTokenMatcher)
        }
    )

    export const delegate = parse as any as Definition
}
