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

type AtomicStringDefinition<DeclaredTypeNames extends string[]> =
    | ElementOf<DeclaredTypeNames>
    | BuiltInType

type StringDefinitionRecurse<
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
    : Fragment extends AtomicStringDefinition<DeclaredTypeNames>
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

type StringDefinition<
    Definition extends string,
    DeclaredTypeNames extends string[]
> = Definition extends OptionalType<infer OptionalType>
    ? `${StringDefinitionRecurse<OptionalType, DeclaredTypeNames>}?`
    : StringDefinitionRecurse<Definition, DeclaredTypeNames>

type NonStringOrRecord = Exclude<NonRecursible | any[], string>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
export type ObjectDefinition<Definition, DeclaredTypeNames extends string[]> = {
    [PropName in keyof Definition]: Definition[PropName] extends NonStringOrRecord
        ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              ObjectDefinition<Definition[PropName], DeclaredTypeNames>
          >
        : StringDefinition<
              Extract<Definition[PropName], string>,
              DeclaredTypeNames
          >
}

export type TypeDefinition<
    Definition,
    DeclaredTypeNames extends string[]
> = Definition extends string
    ? StringDefinition<Definition, DeclaredTypeNames>
    : ObjectDefinition<Definition, DeclaredTypeNames>

export type TypeSet<
    Definitions,
    DeclaredTypeNames extends string[] = Extract<
        keyof MergeAll<Definitions>,
        string
    >[]
> = {
    [K in keyof Definitions]: TypeDefinition<Definitions[K], DeclaredTypeNames>
}

const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
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

type DefineFunction<
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
> = <Definition extends ObjectDefinition<Definition, DeclaredTypeNames>>(
    definition: Narrow<Definition>
) => { [K in DefinedTypeName]: Definition }

const createDefineFunction =
    <
        DefinedTypeName extends ElementOf<DeclaredTypeNames>,
        DeclaredTypeNames extends string[]
    >(
        definedTypeName: DefinedTypeName,
        declaredTypeNames: DeclaredTypeNames
    ): DefineFunction<DefinedTypeName, DeclaredTypeNames> =>
    (definition: any) =>
        ({ [definedTypeName]: definition } as any)

export const declareTypes = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names)
})

export const { define } = declareTypes("user", "group")

define.group({ a: "string", b: "user" })
