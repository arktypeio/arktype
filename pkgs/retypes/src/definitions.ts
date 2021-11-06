import {
    transform,
    ElementOf,
    TypeError,
    ListPossibleTypes,
    Evaluate,
    StringifyPossibleTypes,
    MergeAll,
    DiffUnions,
    UnionDiffResult,
    RemoveSpaces,
    Split,
    Join,
    Unlisted,
    Narrow,
    WithDefaults
} from "@re-do/utils"
import {
    // OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition
} from "./common.js"
import { DefinitionTypeError, UnknownTypeError } from "./errors.js"
import { Or } from "./components/or.js"
import { String } from "./components/string.js"

export type ObjectDefinition<
    Definition,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean
> = Evaluate<
    {
        [PropName in keyof Definition]: TypeDefinition<
            Definition[PropName],
            DeclaredTypeName,
            { extractTypesReferenced: ExtractTypesReferenced }
        >
    }
>

export type TypeDefinitionOptions = {
    extractTypesReferenced?: boolean
}

export type TypeDefinition<
    Definition,
    DeclaredTypeName extends string,
    ProvidedOptions extends TypeDefinitionOptions = {},
    Options extends Required<TypeDefinitionOptions> = WithDefaults<
        TypeDefinitionOptions,
        ProvidedOptions,
        { extractTypesReferenced: false }
    >
> = Definition extends number
    ? number
    : Definition extends string
    ? String.Validate<
          Definition,
          DeclaredTypeName,
          Options["extractTypesReferenced"]
      >
    : Definition extends UnvalidatedObjectDefinition
    ? ObjectDefinition<
          Definition,
          DeclaredTypeName,
          Options["extractTypesReferenced"]
      >
    : DefinitionTypeError

export type TypeDefinitions<
    Definitions,
    DeclaredTypeName extends string = keyof MergeAll<Definitions> & string
> = {
    [Index in keyof Definitions]: TypeDefinition<
        Definitions[Index],
        DeclaredTypeName
    >
}

export type TypeSet<
    TypeSet,
    ExternalTypeName extends string = never,
    TypeNames extends string = (keyof TypeSet | ExternalTypeName) & string
> = {
    [TypeName in keyof TypeSet]: TypeDefinition<TypeSet[TypeName], TypeNames>
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
            ? TypeDefinition<Definitions[Index], DefinedTypeName>
            : TypeError<`Definitions must be objects with string keys representing defined type names.`>
    }
