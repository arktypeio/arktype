import {
    Evaluate,
    isRecursible,
    Recursible as ExtractRecursible
} from "@re-do/utils"
import {
    typeDefProxy,
    ParseConfig,
    createParser,
    DefinitionTypeError
} from "./internal.js"
import { Root } from "../root.js"
import { Obj } from "./obj.js"
import { Tuple } from "./tuple.js"

export namespace Recursible {
    export type Definition<
        Def extends { [K in string]: any } = { [K in string]: any }
    > = Def extends ExtractRecursible<Def> ? Def : never

    export type Validate<Def, TypeSet> = Def extends Tuple.Definition
        ? Tuple.Validate<Def, TypeSet>
        : Def extends Obj.Definition
        ? Obj.Validate<Def, TypeSet>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseConfig
    > = Def extends Tuple.Definition
        ? Evaluate<Tuple.Parse<Def, TypeSet, Options>>
        : Def extends Obj.Definition
        ? Evaluate<Obj.Parse<Def, TypeSet, Options>>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Root.parse,
        children: () => [Tuple.delegate, Obj.delegate],
        matches: (definition) => isRecursible(definition)
    })

    export const delegate = parse as any as Definition
}
