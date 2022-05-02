import { createParser, typeDefProxy, UnknownTypeError } from "./internal.js"
import { Optional } from "./optional.js"
import { Str } from "../str.js"

export namespace Modification {
    export type Definition = Optional.Definition

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context
    > = Def extends Optional.Definition
        ? Optional.Parse<Def, Resolutions, Context>
        : UnknownTypeError<Def>

    export type Node = Optional.Node

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options
    > = N extends Optional.Node
        ? Optional.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parser = createParser({
        type,
        parent: () => Str.parser,
        children: () => [Optional.delegate]
    })

    export const delegate = parser as any as Definition
}
