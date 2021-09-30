import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInDefinition,
    UnvalidatedObjectListDefinition,
    UnvalidatedObjectDefinition,
    FunctionDefinition
} from "./common"
import {
    transform,
    ElementOf,
    Exact,
    NonRecursible,
    TypeError,
    ListPossibleTypes,
    Evaluate,
    Key,
    StringifyPossibleTypes,
    MergeAll,
    Diff,
    DiffResult,
    RemoveSpaces,
    Split,
    ExcludeByValue,
    Join,
    Unlisted,
    FilterByValue,
    PropertyOf,
    Cast,
    IsAnyOrUnknown,
    NonObject,
    SimpleFunction,
    IfExtends,
    Narrow
} from "@re-do/utils"

export type ComponentTypesOfStringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[]
> = StringDefinition<Definition, DeclaredTypeNames, true>

export type OrDefinitionRecurse<
    First extends string,
    Second extends string,
    Root extends string,
    DeclaredTypeNames extends string[],
    ReturnComponentTypes extends boolean,
    ValidateFirst = StringDefinitionRecurse<
        First,
        First,
        DeclaredTypeNames,
        ReturnComponentTypes
    >,
    ValidateSecond = StringDefinitionRecurse<
        Second,
        Second,
        DeclaredTypeNames,
        ReturnComponentTypes
    >
> = ReturnComponentTypes extends true
    ? ValidateFirst | ValidateSecond
    : First extends ValidateFirst
    ? Second extends ValidateSecond
        ? Root
        : ValidateSecond
    : ValidateFirst

export type InvalidTypeError<Fragment extends string = string> =
    TypeError<`Unable to determine the type of '${Fragment}'.`>

export type TupleDefinitionRecurse<
    Definition extends string,
    Root extends string,
    DeclaredTypeNames extends string[],
    ReturnComponentTypes extends boolean,
    Definitions extends string[] = Split<Definition, ",">,
    ValidateDefinitions extends string[] = Definition extends ""
        ? []
        : {
              [Index in keyof Definitions]: StringDefinitionRecurse<
                  Definitions[Index] & string,
                  Definitions[Index] & string,
                  DeclaredTypeNames,
                  ReturnComponentTypes
              >
          },
    ValidatedDefinition extends string = Join<ValidateDefinitions, ",">
> = ReturnComponentTypes extends true
    ? Unlisted<ValidateDefinitions>
    : Definition extends ValidatedDefinition
    ? Root
    : Unlisted<
          {
              [I in keyof ValidateDefinitions]: ValidateDefinitions[I] extends InvalidTypeError
                  ? ValidateDefinitions[I]
                  : never
          }
      >

export type FunctionDefinitionRecurse<
    Parameters extends string,
    Return extends string,
    Root extends string,
    DeclaredTypeNames extends string[],
    ReturnComponentTypes extends boolean,
    ValidateParameters extends string = TupleDefinitionRecurse<
        Parameters,
        Parameters,
        DeclaredTypeNames,
        ReturnComponentTypes
    > &
        string,
    ValidateReturn extends string = StringDefinitionRecurse<
        Return,
        Return,
        DeclaredTypeNames,
        ReturnComponentTypes
    >
> = ReturnComponentTypes extends true
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
    ReturnComponentTypes extends boolean
> = Fragment extends FunctionDefinition<infer Parameters, infer Return>
    ? FunctionDefinitionRecurse<
          Parameters,
          Return,
          Root,
          DeclaredTypeNames,
          ReturnComponentTypes
      >
    : Fragment extends ListDefinition<infer ListItem>
    ? StringDefinitionRecurse<
          ListItem,
          Root,
          DeclaredTypeNames,
          ReturnComponentTypes
      >
    : Fragment extends OrDefinition<infer First, infer Second>
    ? OrDefinitionRecurse<
          First,
          Second,
          Root,
          DeclaredTypeNames,
          ReturnComponentTypes
      >
    : Fragment extends ElementOf<DeclaredTypeNames> | BuiltInDefinition
    ? ReturnComponentTypes extends true
        ? Fragment
        : Root
    : InvalidTypeError<Fragment>

export type StringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[],
    ReturnBaseName extends boolean = false,
    ParsableDefinition extends string = RemoveSpaces<Definition>
> = StringDefinitionRecurse<
    ParsableDefinition extends OptionalDefinition<infer Optional>
        ? Optional
        : ParsableDefinition,
    Definition,
    DeclaredTypeNames,
    ReturnBaseName
>

export type InvalidTypeDefError =
    TypeError<`A type definition must be an object whose keys are strings and whose values are strings or nested type definitions.`>

export type ObjectDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    AllowedProp extends string = string
> = Evaluate<
    {
        [PropName in keyof Definition]: PropName extends AllowedProp
            ? TypeDefinition<Definition[PropName], DeclaredTypeNames>
            : TypeError<`Defined type '${PropName &
                  string}' was never declared.`>
    }
>

export type TypeDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    AllowedProp extends string = string
> = Definition extends string
    ? StringDefinition<Definition, DeclaredTypeNames>
    : Definition extends UnvalidatedObjectListDefinition<
          infer InnerObjectDefinition
      >
    ? UnvalidatedObjectListDefinition<
          ObjectDefinition<InnerObjectDefinition, DeclaredTypeNames>
      >
    : Definition extends UnvalidatedObjectDefinition<Definition>
    ? ObjectDefinition<Definition, DeclaredTypeNames, AllowedProp>
    : InvalidTypeDefError

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
    TypeNames extends keyof TypeSet & string = keyof TypeSet & string
> = {
    [TypeName in TypeNames]: TypeDefinition<
        TypeSet[TypeName],
        ListPossibleTypes<TypeNames>
    >
}

export type TypeSetFromDefinitions<Definitions> = MergeAll<
    TypeDefinitions<Definitions>
>

export const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction(typeName as string, typeNames)
    ]) as {
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

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = Diff<
    DeclaredTypeName,
    DefinedTypeName
> extends DiffResult<infer Missing, any>
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
        [Index in keyof Definitions]: Definitions[Index] extends UnvalidatedObjectDefinition<
            Definitions[Index]
        >
            ? TypeDefinition<
                  Definitions[Index],
                  ListPossibleTypes<DefinedTypeName>,
                  DeclaredTypeName
              >
            : TypeError<`Definitions must be objects with string keys representing defined type names.`>
    }
