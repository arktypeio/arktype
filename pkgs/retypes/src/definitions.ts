import {
    ElementOf,
    TypeError,
    StringifyPossibleTypes,
    MergeAll,
    DiffUnions,
    UnionDiffResult
} from "@re-do/utils"
import { UnvalidatedObjectDefinition } from "./common.js"
import { Root } from "./components"

export type TypeDefinitions<
    Definitions,
    DeclaredTypeName extends string = keyof MergeAll<Definitions> & string
> = {
    [Index in keyof Definitions]: Root.Validate<
        Definitions[Index],
        DeclaredTypeName
    >
}

export type TypeSet<
    TypeSet,
    ExternalTypeName extends string = never,
    TypeNames extends string = (keyof TypeSet | ExternalTypeName) & string
> = {
    [TypeName in keyof TypeSet]: Root.Validate<TypeSet[TypeName], TypeNames>
}

export type TypeSetFromDefinitions<Definitions> = MergeAll<
    TypeDefinitions<Definitions>
>

export type TypeNameFrom<Definitions> = keyof MergeAll<Definitions> & string

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
    DeclaredTypeName,
    DefinedTypeName
> extends UnionDiffResult<infer Extraneous, infer Missing>
    ? Missing extends []
        ? Extraneous extends []
            ? {}
            : `Defined types '${StringifyPossibleTypes<
                  ElementOf<Extraneous>
              >}' were never declared.`
        : `Declared types ${StringifyPossibleTypes<`'${ElementOf<Missing>}'`>} were never defined.`
    : never

export type TypeSetDefinitions<
    Definitions,
    DeclaredTypeName extends string = TypeNameFrom<Definitions>,
    DefinedTypeName extends string = TypeNameFrom<Definitions>
> = MissingTypesError<DeclaredTypeName, DefinedTypeName> &
    {
        [Index in keyof Definitions]: Definitions[Index] extends UnvalidatedObjectDefinition
            ? Root.Validate<Definitions[Index], DefinedTypeName>
            : TypeError<`Definitions must be objects with string keys representing defined type names.`>
    }
