import {
    Evaluate,
    isRecursible,
    Recursible as ExtractRecursible
} from "@re-do/utils"
import { Root } from "../common.js"
import { NodeInput } from "../parser.js"
import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Obj, Tuple } from "./index.js"
import { obj } from "./obj.js"
import { tuple } from "./tuple.js"

export namespace Recursible {
    export type Definition<
        Def extends { [K in string]: any } = { [K in string]: any }
    > = Def extends ExtractRecursible<Def> ? Def : never

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends Tuple.Definition
        ? Tuple.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
        : Def extends Obj.Definition
        ? Obj.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
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
}

export const recursible: NodeInput<Root.Definition, Recursible.Definition> = {
    matches: ({ definition }) => isRecursible(definition),
    children: [tuple, obj]
}
