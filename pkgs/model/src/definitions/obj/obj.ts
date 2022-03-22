import { Evaluate, Func, isRecursible } from "@re-/tools"
import {
    typeDefProxy,
    ParseConfig,
    createParser,
    DefinitionTypeError,
    ValidationErrorMessage,
    ParseTypeContext
} from "./internal.js"
import { Root } from "../root.js"
import { Map } from "./map.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    export type Definition = Map.Definition | Tuple.Definition

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext
    > = Def extends Func
        ? DefinitionTypeError
        : Def extends Tuple.Definition
        ? Tuple.Parse<Def, Space, Context>
        : Def extends Map.Definition
        ? Map.Parse<Def, Space, Context>
        : DefinitionTypeError

    export type Node = Map.Node | Tuple.Node

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig
    > = N extends Map.Node
        ? Map.TypeOf<N, Space, Options>
        : N extends Tuple.Node
        ? Tuple.TypeOf<N, Space, Options>
        : unknown

    // // Since functions satisfy Map.Definition, we have to check
    // // that the def is not a function before trying to validate it
    // export type Check<Def, Space> = Def extends Func
    //     ? DefinitionTypeError
    //     : Def extends Tuple.Definition
    //     ? Tuple.Check<Def, Space>
    //     : Def extends Map.Definition
    //     ? Map.Check<Def, Space>
    //     : DefinitionTypeError

    // export type Parse<
    //     Def extends Definition,
    //     Space,
    //     Options extends ParseConfig
    // > = Obj.Check<Def, Space> extends ValidationErrorMessage
    //     ? unknown
    //     : Def extends Tuple.Definition
    //     ? Evaluate<Tuple.Parse<Def, Space, Options>>
    //     : Def extends Map.Definition
    //     ? Evaluate<Map.Parse<Def, Space, Options>>
    //     : unknown

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
