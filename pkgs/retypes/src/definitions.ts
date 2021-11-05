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
    WithDefaults,
    Or
} from "@re-do/utils"
import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInTypeName,
    UnvalidatedObjectDefinition,
    FunctionDefinition,
    StringLiteralDefinition,
    NumericStringLiteralDefinition
} from "./common.js"
import { DefinitionTypeError, UnknownTypeError } from "./errors.js"

export type OrDefinitionRecurse<
    First extends string,
    Second extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    ValidateFirst = StringDefinitionRecurse<
        First,
        First,
        DeclaredTypeName,
        ExtractTypesReferenced
    >,
    ValidateSecond = StringDefinitionRecurse<
        Second,
        Second,
        DeclaredTypeName,
        ExtractTypesReferenced
    >
> = ExtractTypesReferenced extends true
    ? ValidateFirst | ValidateSecond
    : First extends ValidateFirst
    ? Second extends ValidateSecond
        ? Root
        : ValidateSecond
    : ValidateFirst

export type TupleDefinitionRecurse<
    Definition extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    Definitions extends string[] = Split<Definition, ",">,
    ValidateDefinitions extends string[] = Definition extends ""
        ? []
        : {
              [Index in keyof Definitions]: StringDefinitionRecurse<
                  Definitions[Index] & string,
                  Definitions[Index] & string,
                  DeclaredTypeName,
                  ExtractTypesReferenced
              >
          },
    ValidatedDefinition extends string = Join<ValidateDefinitions, ",">
> = ExtractTypesReferenced extends true
    ? Unlisted<ValidateDefinitions>
    : Definition extends ValidatedDefinition
    ? Root
    : Unlisted<
          {
              [I in keyof ValidateDefinitions]: ValidateDefinitions[I] extends UnknownTypeError
                  ? ValidateDefinitions[I]
                  : never
          }
      >

export type FunctionDefinitionRecurse<
    Parameters extends string,
    Return extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    ValidateParameters extends string = TupleDefinitionRecurse<
        Parameters,
        Parameters,
        DeclaredTypeName,
        ExtractTypesReferenced
    > &
        string,
    ValidateReturn extends string = StringDefinitionRecurse<
        Return,
        Return,
        DeclaredTypeName,
        ExtractTypesReferenced
    >
> = ExtractTypesReferenced extends true
    ? ValidateParameters | ValidateReturn
    : Parameters extends ValidateParameters
    ? Return extends ValidateReturn
        ? Root
        : ValidateReturn
    : ValidateParameters

export type StringDefinitionRecurse<
    Fragment extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean
> = Fragment extends OrDefinition<infer First, infer Second>
    ? OrDefinitionRecurse<
          First,
          Second,
          Root,
          DeclaredTypeName,
          ExtractTypesReferenced
      >
    : Fragment extends FunctionDefinition<infer Parameters, infer Return>
    ? FunctionDefinitionRecurse<
          Parameters,
          Return,
          Root,
          DeclaredTypeName,
          ExtractTypesReferenced
      >
    : Fragment extends ListDefinition<infer ListItem>
    ? StringDefinitionRecurse<
          ListItem,
          Root,
          DeclaredTypeName,
          ExtractTypesReferenced
      >
    : Fragment extends
          | DeclaredTypeName
          | BuiltInTypeName
          | StringLiteralDefinition
          | NumericStringLiteralDefinition
    ? ExtractTypesReferenced extends true
        ? Fragment
        : Root
    : UnknownTypeError<Fragment>

export type StringDefinition<
    Definition extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean,
    ParsableDefinition extends string = RemoveSpaces<Definition>
> = StringDefinitionRecurse<
    ParsableDefinition extends OptionalDefinition<infer Optional>
        ? Optional
        : ParsableDefinition,
    Definition,
    DeclaredTypeName,
    ExtractTypesReferenced
>

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
    ? StringDefinition<
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
