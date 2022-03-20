import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError
} from "../internal.js"
import { Reference } from "./reference/index.js"
import { Expression } from "./expression/index.js"
import { Str } from "../str.js"

export namespace Fragment {
    export type Definition = string

    export type Parse<
        Def extends string,
        Space
    > = Def extends Reference.Definition<Space>
        ? Def
        : Def extends Expression.Definition
        ? Expression.Parse<Def, Space>
        : UnknownTypeError<Def>

    export type Node = Expression.Node | Reference.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig
    > = N extends Reference.Node
        ? Reference.TypeOf<N, Space, Options>
        : N extends Expression.Node
        ? Expression.TypeOf<N, Space, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
            children: () => [Reference.delegate, Expression.delegate]
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parse as any as Definition
}
