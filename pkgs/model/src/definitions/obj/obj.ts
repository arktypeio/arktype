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
