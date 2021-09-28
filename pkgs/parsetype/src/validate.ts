import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInDefinition,
    ObjectListDefinition,
    ObjectDefinition
} from "./common"
import {
    Narrow,
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
    DiffResult
} from "@re-do/utils"

export type BaseNameOfStringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[]
> = ValidateStringDefinition<Definition, DeclaredTypeNames, true>

export type OrDefinitionRecurse<
    First extends string,
    Second extends string,
    Root extends string,
    DeclaredTypeNames extends string[],
    ReturnBaseType extends boolean,
    ValidateFirst = ValidateStringDefinitionRecurse<
        First,
        First,
        DeclaredTypeNames,
        ReturnBaseType
    >,
    ValidateSecond = ValidateStringDefinitionRecurse<
        Second,
        Second,
        DeclaredTypeNames,
        ReturnBaseType
    >
> = ReturnBaseType extends true
    ? ValidateFirst | ValidateSecond
    : First extends ValidateFirst
    ? Second extends ValidateSecond
        ? Root
        : ValidateSecond
    : ValidateFirst

export type ValidateStringDefinitionRecurse<
    Fragment extends string,
    Root extends string,
    DeclaredTypeNames extends string[],
    ReturnBaseType extends boolean
> = Fragment extends ListDefinition<infer ListItem>
    ? ValidateStringDefinitionRecurse<
          ListItem,
          Root,
          DeclaredTypeNames,
          ReturnBaseType
      >
    : Fragment extends OrDefinition<infer First, infer Second>
    ? OrDefinitionRecurse<
          First,
          Second,
          Root,
          DeclaredTypeNames,
          ReturnBaseType
      >
    : Fragment extends ElementOf<DeclaredTypeNames> | BuiltInDefinition
    ? ReturnBaseType extends true
        ? Fragment
        : Root
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

export type ValidateStringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[],
    ReturnBaseName extends boolean = false
> = ValidateStringDefinitionRecurse<
    Definition extends OptionalDefinition<infer Optional>
        ? Optional
        : Definition,
    Definition,
    DeclaredTypeNames,
    ReturnBaseName
>

export type InvalidTypeDefError =
    TypeError<`A type definition must be an object whose keys are strings and whose values are strings or nested type definitions.`>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
export type ValidateObjectDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    AllowedProp extends string = string
> = Evaluate<
    {
        [PropName in keyof Definition]: PropName extends AllowedProp
            ? ValidateTypeDefinition<Definition[PropName], DeclaredTypeNames>
            : TypeError<`Defined type '${PropName &
                  string}' was never declared.`>
    }
>

export type ValidateTypeDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    AllowedProp extends string = string
> = Definition extends string
    ? ValidateStringDefinition<Definition, DeclaredTypeNames>
    : Definition extends ObjectListDefinition<infer InnerObjectDefinition>
    ? ObjectListDefinition<
          ValidateObjectDefinition<InnerObjectDefinition, DeclaredTypeNames>
      >
    : Definition extends ObjectDefinition<Definition>
    ? ValidateObjectDefinition<Definition, DeclaredTypeNames, AllowedProp>
    : InvalidTypeDefError

export type ValidateTypeDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = ListPossibleTypes<
        keyof MergeAll<Definitions>
    >
> = {
    [Index in keyof Definitions]: ValidateTypeDefinition<
        Definitions[Index],
        DeclaredTypeNames
    >
}

export type ValidateTypeSet<
    TypeSet,
    TypeNames extends keyof TypeSet & string = keyof TypeSet & string
> = {
    [TypeName in TypeNames]: ValidateTypeDefinition<
        TypeSet[TypeName],
        ListPossibleTypes<TypeNames>
    >
}

export type TypeSetFromDefinitions<Definitions> = MergeAll<
    ValidateTypeDefinitions<Definitions>
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
    definition: Narrow<ValidateTypeDefinition<Definition, DeclaredTypeNames>>
) => { [K in DefinedTypeName]: Definition }

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

export type ValidateTypeSetDefinitions<
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
        [Index in keyof Definitions]: Definitions[Index] extends ObjectDefinition<
            Definitions[Index]
        >
            ? ValidateTypeDefinition<
                  Definitions[Index],
                  ListPossibleTypes<DefinedTypeName>,
                  DeclaredTypeName
              >
            : TypeError<`Definitions must be objects with string keys representing defined type names.`>
    }
