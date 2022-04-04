import { createParser, TypeOfContext, typeDefProxy } from "./internal.js"
import { Fragment } from "../fragment.js"
import { Keyword } from "./keyword/keyword.js"
import { Literal } from "./literal/literal.js"
import { Alias } from "./alias.js"

export namespace Reference {
    export type Definition<Resolutions> =
        | Keyword.Definition
        | Literal.Definition
        | Alias.Definition<Resolutions>

    export type Matches<
        Def extends string,
        Resolutions
    > = Literal.Matches<Def> extends true
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
        : N extends Literal.Definition
        ? Literal.TypeOf<N>
        : N extends Alias.Definition<Resolutions>
        ? Alias.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as string

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            children: () => [Keyword.delegate, Literal.delegate, Alias.delegate]
        },
        { references: ({ def }) => [def] }
    )

    export const delegate = parse as any as string
}
