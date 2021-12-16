import {
    Evaluate,
    isRecursible,
    Recursible as ExtractRecursible
} from "@re-/utils"
import {
    typeDefProxy,
    ParseConfig,
    createParser,
    DefinitionTypeError
} from "./internal.js"
import { Root } from "../root.js"
import { Map } from "./map.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    export type Definition<
        Def extends { [K in string]: any } = { [K in string]: any }
    > = Def extends ExtractRecursible<Def> ? Def : never

    export type Validate<Def, Typespace> = Def extends Tuple.Definition
        ? Tuple.Validate<Def, Typespace>
        : Def extends Map.Definition
        ? Map.Validate<Def, Typespace>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        Typespace,
        Options extends ParseConfig
    > = Def extends Tuple.Definition
        ? Evaluate<Tuple.Parse<Def, Typespace, Options>>
        : Def extends Map.Definition
        ? Evaluate<Map.Parse<Def, Typespace, Options>>
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
