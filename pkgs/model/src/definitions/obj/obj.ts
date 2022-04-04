import { Func, isRecursible } from "@re-/tools"
import {
    typeDefProxy,
    TypeOfContext,
    createParser,
    DefinitionTypeError,
    ParseTypeContext
} from "./internal.js"
import { Root } from "../root.js"
import { Map } from "./map.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    export type Definition = Map.Definition | Tuple.Definition

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context extends ParseTypeContext
    > = Def extends Tuple.Definition
        ? Tuple.Parse<Def, Resolutions, Context>
        : Def extends Map.Definition
        ? Map.Parse<Def, Resolutions, Context>
        : DefinitionTypeError

    export type Node = Map.Node | Tuple.Node

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = N extends Map.Node
        ? Map.TypeOf<N, Resolutions, Options>
        : N extends Tuple.Node
        ? Tuple.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [Tuple.delegate, Map.delegate]
        },
        {
            matches: (definition) => isRecursible(definition)
        }
    )

    export const delegate = parse as any as Definition
}
