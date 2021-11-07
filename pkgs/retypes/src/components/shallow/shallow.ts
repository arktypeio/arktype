import { ParseTypeRecurseOptions, DefinitionTypeError } from "./common.js"
import { Str } from "."

export type Definition<Def extends string | number = string | number> = Def

export type Validate<
    Def extends Definition,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean
> = Def extends number
    ? Def
    : Def extends string
    ? Str.Validate<Def, DeclaredTypeName, ExtractTypesReferenced>
    : DefinitionTypeError

export type Parse<
    Def extends Definition,
    TypeSet,
    Options extends ParseTypeRecurseOptions
> = Def extends number
    ? Def
    : Def extends string
    ? Str.Parse<Def, TypeSet, Options>
    : DefinitionTypeError
