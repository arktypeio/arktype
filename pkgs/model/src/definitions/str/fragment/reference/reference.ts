import { createParser, TypeOfContext, typeDefProxy } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Keyword } from "./keyword/keyword.js"
import { EmbeddedLiteral } from "./embeddedLiteral/embeddedLiteral.js"
import { Alias } from "./alias.js"

export namespace Reference {
    export type Definition<Resolutions> =
        | Keyword.Definition
        | EmbeddedLiteral.Definition
        | Alias.Definition<Resolutions>

    export type Matches<
        Def extends string,
        Resolutions
    > = EmbeddedLiteral.Matches<Def> extends true
        ? true
        : Def extends Keyword.Definition | Alias.Definition<Resolutions>
        ? true
        : false

    export type Node = string

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = N extends Keyword.Definition
        ? Keyword.TypeOf<N>
        : N extends EmbeddedLiteral.Definition
        ? EmbeddedLiteral.TypeOf<N>
        : N extends Alias.Definition<Resolutions>
        ? Alias.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as string

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            children: () => [
                Keyword.delegate,
                EmbeddedLiteral.delegate,
                Alias.delegate
            ]
        },
        { references: ({ def }) => [def] }
    )

    export const delegate = parse as any as string
}
