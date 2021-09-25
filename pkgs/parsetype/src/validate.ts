import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    MergeAll
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
    Key
} from "@re-do/utils"

export type StringDefinitionRecurse<
    Fragment extends string,
    DeclaredTypeNames extends string[]
> = Fragment extends GroupedType<infer Group>
    ? `(${StringDefinitionRecurse<Group, DeclaredTypeNames>})`
    : Fragment extends ListType<infer ListItem>
    ? `${StringDefinitionRecurse<ListItem, DeclaredTypeNames>}[]`
    : Fragment extends OrType<infer First, infer Second>
    ? `${StringDefinitionRecurse<
          First,
          DeclaredTypeNames
      >}|${StringDefinitionRecurse<Second, DeclaredTypeNames>}`
    : Fragment extends ElementOf<DeclaredTypeNames> | BuiltInType
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

export type ValidateStringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[]
> = Definition extends OptionalType<infer OptionalType>
    ? `${StringDefinitionRecurse<OptionalType, DeclaredTypeNames>}?`
    : StringDefinitionRecurse<Definition, DeclaredTypeNames>

export type NonStringOrRecord = Exclude<NonRecursible | any[], string>

export type TreeOf<T, KeyType extends Key = string> =
    | T
    | {
          [K in string]: TreeOf<T, KeyType>
      }

export type UnvalidatedDefinition = TreeOf<string>

export type UnvalidatedObjectDefinition = {
    [K in string]: UnvalidatedDefinition
}

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
export type ValidateObjectDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    AllowedProp extends string = string
> = Evaluate<
    {
        [PropName in keyof Definition]: PropName extends AllowedProp
            ? Definition[PropName] extends NonStringOrRecord
                ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
                : Definition[PropName] extends object
                ? Exact<
                      Definition[PropName],
                      ValidateObjectDefinition<
                          Definition[PropName] & object,
                          DeclaredTypeNames
                      >
                  >
                : // As of TS 4.42, Extract<Definition[PropName], string> mysteriously breaks this type. Maybe some faulty caching?
                  ValidateStringDefinition<
                      Definition[PropName] & string,
                      DeclaredTypeNames
                  >
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
    : ValidateObjectDefinition<Definition, DeclaredTypeNames, AllowedProp>

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
> = <
    Definition extends ValidateObjectDefinition<Definition, DeclaredTypeNames>
>(
    definition: Narrow<Definition>
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
