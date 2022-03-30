import {
    TypeOfContext,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ParseTypeContext
} from "./internal.js"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Union } from "./union.js"
import { Fragment } from "../fragment.js"
import { Constraint } from "./constraint.js"
import { Intersection } from "./intersection.js"

export namespace Expression {
    export type Definition =
        | ArrowFunction.Definition
        | Union.Definition
        | Intersection.Definition
        | Constraint.Definition
        | List.Definition

    export type Parse<
        Def extends string,
        Space,
        Context extends ParseTypeContext
    > = Def extends ArrowFunction.Definition
        ? ArrowFunction.Parse<Def, Space, Context>
        : Def extends Union.Definition
        ? Union.Parse<Def, Space, Context>
        : Def extends Intersection.Definition
        ? Intersection.Parse<Def, Space, Context>
        : Def extends Constraint.Definition
        ? Constraint.Parse<Def, Space, Context>
        : Def extends List.Definition
        ? List.Parse<Def, Space, Context>
        : UnknownTypeError<Def>

    export type Node =
        | ArrowFunction.Node
        | Union.Node
        | Intersection.Node
        | Constraint.Node
        | List.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext<Space>
    > = N extends ArrowFunction.Node
        ? ArrowFunction.TypeOf<N, Space, Options>
        : N extends Union.Node
        ? Union.TypeOf<N, Space, Options>
        : N extends Intersection.Node
        ? Intersection.TypeOf<N, Space, Options>
        : N extends Constraint.Node
        ? Constraint.TypeOf<N, Space, Options>
        : N extends List.Node
        ? List.TypeOf<N, Space, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [
            ArrowFunction.delegate,
            Union.delegate,
            Intersection.delegate,
            Constraint.delegate,
            List.delegate
        ]
    })

    export const delegate = parse as any as Definition
}
