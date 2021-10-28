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
    DeclaredTypeNames extends string[],
    ExtractTypesReferenced extends boolean,
    ValidateFirst = StringDefinitionRecurse<
        First,
        First,
        DeclaredTypeNames,
        ExtractTypesReferenced
    >,
    ValidateSecond = StringDefinitionRecurse<
        Second,
        Second,
        DeclaredTypeNames,
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
    DeclaredTypeNames extends string[],
    ExtractTypesReferenced extends boolean,
    Definitions extends string[] = Split<Definition, ",">,
    ValidateDefinitions extends string[] = Definition extends ""
        ? []
        : {
              [Index in keyof Definitions]: StringDefinitionRecurse<
                  Definitions[Index] & string,
                  Definitions[Index] & string,
                  DeclaredTypeNames,
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
    DeclaredTypeNames extends string[],
    ExtractTypesReferenced extends boolean,
    ValidateParameters extends string = TupleDefinitionRecurse<
        Parameters,
        Parameters,
        DeclaredTypeNames,
        ExtractTypesReferenced
    > &
        string,
    ValidateReturn extends string = StringDefinitionRecurse<
        Return,
        Return,
        DeclaredTypeNames,
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
    DeclaredTypeNames extends string[],
    ExtractTypesReferenced extends boolean
> = Fragment extends OrDefinition<infer First, infer Second>
    ? OrDefinitionRecurse<
          First,
          Second,
          Root,
          DeclaredTypeNames,
          ExtractTypesReferenced
      >
    : Fragment extends FunctionDefinition<infer Parameters, infer Return>
    ? FunctionDefinitionRecurse<
          Parameters,
          Return,
          Root,
          DeclaredTypeNames,
          ExtractTypesReferenced
      >
    : Fragment extends ListDefinition<infer ListItem>
    ? StringDefinitionRecurse<
          ListItem,
          Root,
          DeclaredTypeNames,
          ExtractTypesReferenced
      >
    : Fragment extends
          | ElementOf<DeclaredTypeNames>
          | BuiltInTypeName
          | StringLiteralDefinition
          | NumericStringLiteralDefinition
    ? ExtractTypesReferenced extends true
        ? Fragment
        : Root
    : UnknownTypeError<Fragment>

export type StringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[],
    ExtractTypesReferenced extends boolean,
    ParsableDefinition extends string = RemoveSpaces<Definition>
> = StringDefinitionRecurse<
    ParsableDefinition extends OptionalDefinition<infer Optional>
        ? Optional
        : ParsableDefinition,
    Definition,
    DeclaredTypeNames,
    ExtractTypesReferenced
>

export type ObjectDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    ExtractTypesReferenced extends boolean
> = Evaluate<
    {
        [PropName in keyof Definition]: TypeDefinition<
            Definition[PropName],
            DeclaredTypeNames,
            { extractTypesReferenced: ExtractTypesReferenced }
        >
    }
>

export type TypeDefinitionOptions = {
    extractTypesReferenced?: boolean
}

export type TypeDefinition<
    Definition,
    DeclaredTypeNames extends string[],
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
          DeclaredTypeNames,
          Options["extractTypesReferenced"]
      >
    : Definition extends UnvalidatedObjectDefinition<Definition>
    ? ObjectDefinition<
          Definition,
          DeclaredTypeNames,
          Options["extractTypesReferenced"]
      >
    : DefinitionTypeError

export type TypeDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = ListPossibleTypes<
        keyof MergeAll<Definitions>
    >
> = {
    [Index in keyof Definitions]: TypeDefinition<
        Definitions[Index],
        DeclaredTypeNames
    >
}

export type TypeSet<
    TypeSet,
    ExternalTypeName extends string = never,
    TypeNames extends string[] = ListPossibleTypes<
        keyof TypeSet | ExternalTypeName
    >
> = {
    [TypeName in keyof TypeSet]: TypeDefinition<TypeSet[TypeName], TypeNames>
}

export type TypeSetFromDefinitions<Definitions> = Evaluate<
    MergeAll<TypeDefinitions<Definitions>>
>

export const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction(typeName as string, typeNames)
    ]) as DefineFunctionMap<DeclaredTypeNames>

export type DefineFunctionMap<DeclaredTypeNames extends string[]> = {
    [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DefineFunction<
        DefinedTypeName,
        DeclaredTypeNames
    >
}

export type DefineFunction<
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
> = <Definition>(
    definition: Narrow<TypeDefinition<Definition, DeclaredTypeNames>>
) => {
    [K in DefinedTypeName]: Definition
}

export const createDefineFunction =
    <
        DefinedTypeName extends ElementOf<DeclaredTypeNames>,
        DeclaredTypeNames extends string[]
    >(
        definedTypeName: DefinedTypeName,
        declaredTypeNames: DeclaredTypeNames
    ): DefineFunction<DefinedTypeName, DeclaredTypeNames> =>
    (definition: any) =>
        ({ [definedTypeName]: definition } as any)

export type TypeNamesFrom<Definitions> = ListPossibleTypes<
    keyof MergeAll<Definitions> & string
>

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
    DeclaredTypeName,
    DefinedTypeName
> extends UnionDiffResult<any, infer Missing>
    ? Missing extends []
        ? {}
        : `Declared types ${StringifyPossibleTypes<`'${ElementOf<Missing>}'`>} were never defined.`
    : never

export type TypeSetDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    DefinedTypeNames extends string[] = TypeNamesFrom<Definitions>,
    DefinedTypeName extends string = ElementOf<DefinedTypeNames>,
    // If no names are declared, just copy the names from the definitions
    // to ensure a valid DiffResult
    DeclaredTypeName extends string = ElementOf<
        DeclaredTypeNames extends [] ? DefinedTypeNames : DeclaredTypeNames
    >
> = MissingTypesError<DeclaredTypeName, DefinedTypeName> &
    {
        [Index in keyof Definitions]: Definitions[Index] extends UnvalidatedObjectDefinition
            ? keyof Definitions[Index] extends DeclaredTypeName
                ? TypeDefinition<
                      Definitions[Index],
                      ListPossibleTypes<DefinedTypeName>
                  >
                : TypeError<`Defined types '${StringifyPossibleTypes<
                      Exclude<
                          keyof Definitions[Index] & string,
                          DeclaredTypeName
                      >
                  >}' were never declared.`>
            : TypeError<`Definitions must be objects with string keys representing defined type names.`>
    }
