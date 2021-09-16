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
    TypeError
} from "@re-do/utils"

const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction(typeName as string)
    ]) as {
        [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DefineFunction<
            ElementOf<DeclaredTypeNames>,
            DefinedTypeName
        >
    }

type DefineFunction<
    DeclaredTypeName extends string,
    DefinedTypeName extends DeclaredTypeName
> = <Definition extends ObjectDefinition<Definition, DeclaredTypeName>>(
    definition: Narrow<Definition>
) => { [K in DefinedTypeName]: Definition }

type AtomicStringDefinition<DeclaredName extends string> =
    | DeclaredName
    | BuiltInType

type StringDefinitionRecurse<
    Fragment extends string,
    DeclaredName extends string
> = Fragment extends GroupedType<infer Group>
    ? `(${StringDefinitionRecurse<DeclaredName, Group>})`
    : Fragment extends ListType<infer ListItem>
    ? `${StringDefinitionRecurse<DeclaredName, ListItem>}[]`
    : Fragment extends OrType<infer First, infer Second>
    ? `${StringDefinitionRecurse<
          DeclaredName,
          First
      >} | ${StringDefinitionRecurse<DeclaredName, Second>}`
    : Fragment extends AtomicStringDefinition<DeclaredName>
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

type StringDefinition<
    Definition extends string,
    DeclaredName extends string
> = Definition extends OptionalType<infer OptionalType>
    ? `${StringDefinitionRecurse<DeclaredName, OptionalType>}?`
    : StringDefinitionRecurse<DeclaredName, Definition>

type NonStringOrRecord = Exclude<NonRecursible | any[], string>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
export type ObjectDefinition<Definition, DeclaredName extends string> = {
    [PropName in keyof Definition]: Definition[PropName] extends NonStringOrRecord
        ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              ObjectDefinition<Definition[PropName], DeclaredName>
          >
        : StringDefinition<Definition[PropName] & string, DeclaredName>
}

export type TypeDefinition<
    Definition,
    DeclaredName extends string
> = Definition extends string
    ? StringDefinition<Definition, DeclaredName>
    : ObjectDefinition<Definition, DeclaredName>

// export type DiscreteTypeSet<TypeSet extends object> = ObjectDefinition<
//     TypeSet,
//     Extract<keyof TypeSet, string>
// >

export type TypeSet<
    Definitions,
    DeclaredTypeName extends string = Extract<
        keyof MergeAll<Definitions>,
        string
    >
> = {
    [K in keyof Definitions]: TypeDefinition<Definitions[K], DeclaredTypeName>
}

const createDefineFunction =
    <DeclaredTypeName extends string, DefinedTypeName extends DeclaredTypeName>(
        definedTypeName: DefinedTypeName
    ): DefineFunction<DeclaredTypeName, DefinedTypeName> =>
    (definition: any) =>
        ({ [definedTypeName]: definition } as any)

export const declareTypes = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names)
})
