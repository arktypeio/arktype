import {
    Evaluate,
    isRecursible,
    Merge,
    Recursible as ExtractRecursible
} from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import {
    Root,
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "../common.js"
import { createParser } from "../parser.js"
import { DefinitionTypeError } from "../errors.js"
import { Obj, Tuple } from "./index.js"

export namespace Recursible {
    export type Definition<
        Def extends { [K in string]: any } = { [K in string]: any }
    > = Def extends ExtractRecursible<Def> ? Def : never

    export type Validate<
        Def,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = Def extends Tuple.Definition
        ? Tuple.Validate<Def, TypeSet, Options>
        : Def extends Obj.Definition
        ? Obj.Validate<Def, TypeSet, Options>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Tuple.Definition
        ? Evaluate<Tuple.Parse<Def, TypeSet, Options>>
        : Def extends Obj.Definition
        ? Evaluate<Obj.Parse<Def, TypeSet, Options>>
        : DefinitionTypeError

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Root.parse,
        children: () => [Tuple.delegate, Obj.delegate],
        matches: (definition) => isRecursible(definition)
    })

    export const delegate = parse as any as Definition
}
