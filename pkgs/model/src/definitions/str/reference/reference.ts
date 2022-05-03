import { createParser, typeDefProxy, Precedence, Defer } from "./internal.js"
import { Str } from "../str.js"
import { Keyword } from "./keyword/keyword.js"
import { EmbeddedLiteral } from "./embeddedLiteral/embeddedLiteral.js"
import { Alias } from "./alias.js"
import { ShallowNode } from "../internal.js"

export namespace Reference {
    export type Definition<Resolutions> =
        | Keyword.Definition
        | EmbeddedLiteral.Definition
        | keyof Resolutions

    export type Matches<
        Def extends string,
        Resolutions
    > = EmbeddedLiteral.Matches<Def> extends true
        ? true
        : Def extends Keyword.Definition | keyof Resolutions
        ? true
        : false

    export type Parse<Def extends string, Resolutions, Options> = Precedence<
        [
            Keyword.Parse<Def>,
            EmbeddedLiteral.Parse<Def>,
            Alias.Parse<Def, Resolutions, Options>
        ]
    >

    export const type = typeDefProxy as string

    export const parser = createParser(
        {
            type,
            parent: () => Str.parser,
            children: () => [
                Keyword.delegate,
                EmbeddedLiteral.delegate,
                Alias.delegate
            ]
        },
        { references: ({ def }) => [def] }
    )

    export const delegate = parser as any as string
}
