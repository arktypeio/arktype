import { Func, isRecursible } from "@re-/tools"
import {
    typeDefProxy,
    TypeOfContext,
    createParser,
    DefinitionTypeError,
    ParseTypeContext,
    Precedence,
    ParseNode
} from "./internal.js"
import { Root } from "../root.js"
import { Map } from "./map.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    export type Parse<Def, Resolutions, Context> = Precedence<
        [
            Tuple.Parse<Def, Resolutions, Context>,
            Map.Parse<Def, Resolutions, Context>
        ]
    >

    export type TypeOf<N, Resolutions, Options> = N["kind"] extends "map"
        ? Map.TypeOf<N, Resolutions, Options>
        : N["kind"] extends "tuple"
        ? Tuple.TypeOf<N, Resolutions, Options>
        : unknown

    export const type = typeDefProxy as object

    export const parser = createParser(
        {
            type,
            parent: () => Root.parser,
            children: () => [Tuple.delegate, Map.delegate]
        },
        {
            matches: (definition) => isRecursible(definition)
        }
    )

    export const delegate = parser as any as object
}
