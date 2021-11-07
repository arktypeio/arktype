import { Evaluate, Recursible } from "@re-do/utils"
import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Obj, Tuple } from "./index.js"

export type Definition<
    Def extends { [K in string]: any } = { [K in string]: any }
> = Def extends Recursible<Def> ? Def : never

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
