import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    FragmentContext
} from "./internal.js"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Union } from "./union.js"
import { Fragment } from "../fragment.js"
import { Evaluate } from "@re-/tools"
import { Tuple } from "../../../obj/tuple.js"

export namespace Expression {
    export type Definition =
        | ArrowFunction.Definition
        | Union.Definition
        | List.Definition

    export type Parse<
        Def extends string,
        Space,
        Context extends FragmentContext
    > = Def extends ArrowFunction.Definition
        ? ArrowFunction.Parse<Def, Space, Context>
        : Def extends Union.Definition
        ? Union.Parse<Def, Space, Context>
        : Def extends List.Definition
        ? List.Parse<Def, Space, Context>
        : UnknownTypeError<Def>

    export type Node = ArrowFunction.Node | Union.Node | List.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig
    > = Evaluate<
        N extends ArrowFunction.Node
            ? ArrowFunction.TypeOf<N, Space, Options>
            : N extends Union.Node
            ? Union.TypeOf<N, Space, Options>
            : N extends List.Node
            ? List.TypeOf<N, Space, Options>
            : unknown
    >

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [ArrowFunction.delegate, Union.delegate, List.delegate]
    })

    export const delegate = parse as any as Definition
}
