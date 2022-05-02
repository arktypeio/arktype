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
        Resolutions,
        Context
    > = Def extends ArrowFunction.Definition
        ? ArrowFunction.Parse<Def, Resolutions, Context>
        : Def extends Union.Definition
        ? Union.Parse<Def, Resolutions, Context>
        : Def extends Intersection.Definition
        ? Intersection.Parse<Def, Resolutions, Context>
        : Def extends Constraint.Definition
        ? Constraint.Parse<Def, Resolutions, Context>
        : Def extends List.Definition
        ? List.Parse<Def, Resolutions, Context>
        : UnknownTypeError<Def>

    export type Node =
        | ArrowFunction.Node
        | Union.Node
        | Intersection.Node
        | Constraint.Node
        | List.Node

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options
    > = N extends ArrowFunction.Node
        ? ArrowFunction.TypeOf<N, Resolutions, Options>
        : N extends Union.Node
        ? Union.TypeOf<N, Resolutions, Options>
        : N extends Intersection.Node
        ? Intersection.TypeOf<N, Resolutions, Options>
        : N extends Constraint.Node
        ? Constraint.TypeOf<N, Resolutions, Options>
        : N extends List.Node
        ? List.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parser = createParser({
        type,
        parent: () => Fragment.parser,
        children: () => [
            ArrowFunction.delegate,
            Union.delegate,
            Intersection.delegate,
            Constraint.delegate,
            List.delegate
        ]
    })

    export const delegate = parser as any as Definition
}
