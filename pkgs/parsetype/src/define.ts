import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    MergeAll,
    Iteration
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
    StringifyPossibleTypes,
    Stringifiable,
    PropertyOf,
    Cast,
    Or,
    And
} from "@re-do/utils"
import { typeSet, ParseType, ParseDefinitions } from "./parse"

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
type ObjectDefinition<
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
                      ObjectDefinition<Definition[PropName], DeclaredTypeNames>
                  >
                : // As of TS 4.42, Extract<Definition[PropName], string> mysteriously breaks this type. Maybe some faulty caching?
                  StringDefinition<
                      Definition[PropName] & string,
                      DeclaredTypeNames
                  >
            : TypeError<`Defined type '${PropName &
                  string}' was never declared.`>
    }
>

export type TypeDefinition<
    Definition,
    DeclaredTypeNames extends string[],
    AllowedProp extends string = keyof Definition & string
> = Definition extends string
    ? StringDefinition<Definition, DeclaredTypeNames>
    : ObjectDefinition<Definition, DeclaredTypeNames, AllowedProp>

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

type DiffResult<Missing extends any[], Extraneous extends any[]> = {
    missing: Missing
    extraneous: Extraneous
}

type Diff<Expected, Actual> = DiffResult<
    Cast<
        ListPossibleTypes<Expected extends Actual ? never : Expected>,
        Expected[]
    >,
    Cast<ListPossibleTypes<Actual extends Expected ? never : Actual>, Actual[]>
>

type DeclaredDefinitions<
    Definitions,
    DeclaredTypeNames extends string[],
    DeclaredTypeName extends string = ElementOf<DeclaredTypeNames>,
    DefinedTypeName extends string = keyof MergeAll<Definitions> & string,
    TypeNameDiff = Diff<DeclaredTypeName, DefinedTypeName>,
    MissingTypesError extends string | {} = TypeNameDiff extends DiffResult<
        infer Missing,
        any
    >
        ? Missing extends []
            ? {}
            : `Declared types ${StringifyPossibleTypes<`'${ElementOf<Missing>}'`>} were never defined.`
        : never
> = {
    [Index in keyof Definitions]: TypeDefinition<
        Definitions[Index],
        ListPossibleTypes<DefinedTypeName>,
        DeclaredTypeName
    >
} &
    MissingTypesError

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    create: <Definitions extends any[]>(
        ...definitions: DeclaredDefinitions<Definitions, DeclaredTypeNames>
    ) => ({
        parse: <
            Definition,
            DeclaredTypeSet = TypeSetFromDefinitions<Definitions>
        >(
            definition: TypeDefinition<
                Definition,
                ListPossibleTypes<keyof DeclaredTypeSet>
            >
        ) => null as ParseType<Definition, DeclaredTypeSet>,
        types: {} as Evaluate<ParseDefinitions<Definitions>>
    })
})

export const { define, create } = declare("user", "group", "jorb", "foop")

const groupDef = define.group({ a: "string", b: "user" })
const userDef = define.user({ a: "number", b: "group" })

const { types } = create(groupDef, userDef, { jorb: "string", foop: "boolean" })
