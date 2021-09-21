import {
    ExcludeByValue,
    FilterByValue,
    TypeError,
    Evaluate,
    Narrow,
    ListPossibleTypes,
    ElementOf,
    Exact
} from "@re-do/utils"
import {
    TypeDefinitions,
    ObjectDefinition,
    TypeDefinition,
    TypeSet
} from "./define"
import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    BuiltInTypeMap,
    MergeAll
} from "./common"

type ParseStringDefinition<
    Definition extends string,
    TypeSet
> = Definition extends OptionalType<infer OptionalType>
    ? ParseStringDefinitionRecurse<OptionalType, TypeSet> | undefined
    : ParseStringDefinitionRecurse<Definition, TypeSet>

type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet
> = Fragment extends GroupedType<infer Group>
    ? ParseStringDefinitionRecurse<Group, TypeSet>
    : Fragment extends ListType<infer ListItem>
    ? ParseStringDefinitionRecurse<ListItem, TypeSet>[]
    : Fragment extends OrType<infer First, infer Second>
    ?
          | ParseStringDefinitionRecurse<First, TypeSet>
          | ParseStringDefinitionRecurse<Second, TypeSet>
    : Fragment extends keyof TypeSet
    ? ParseType<TypeSet[Fragment], TypeSet>
    : Fragment extends BuiltInType
    ? BuiltInTypeMap[Fragment]
    : TypeError<`Unable to parse the type of '${Fragment}'.`>

type ParseObjectDefinition<Definition extends object, TypeSet> = {
    [PropName in keyof ExcludeByValue<Definition, OptionalType>]: ParseType<
        Definition[PropName],
        TypeSet
    >
} &
    {
        [PropName in keyof FilterByValue<
            Definition,
            OptionalType
        >]?: Definition[PropName] extends OptionalType<infer OptionalType>
            ? ParseType<OptionalType, TypeSet>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
    }

export type ParseDefinitions<
    Definitions,
    Merged = MergeAll<Definitions>
> = Evaluate<
    {
        [TypeName in keyof Merged]: ParseType<Merged[TypeName], Merged>
    }
>

export type ParseType<Definition, TypeSet> = Definition extends string
    ? ParseStringDefinition<Definition, TypeSet>
    : Definition extends object
    ? Evaluate<ParseObjectDefinition<Definition, TypeSet>>
    : TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>

// export const parse = <
//     Definition extends ObjectDefinition<
//         Definition,
//         Extract<keyof DeclaredTypeSet, string>
//     >,
//     DeclaredTypeSet extends TypeSet<DeclaredTypeSet>
// >(
//     definition: Narrow<Definition>,
//     declaredTypeSet?: DeclaredTypeSet
// ) => [] as any as ParseType<DeclaredTypeSet, Definition>

// const result = parse({ a: "string" })

// export type ParsableTypeDefinition<
//     Definition,
//     DeclaredTypeNames extends string[] = []
// > = {
//     [K in keyof Definition]: TypeDefinition<Definition[K], DeclaredTypeNames>
// }

export const parse = <Definition, DeclaredTypeSet>(
    definition: TypeDefinition<
        Definition,
        ListPossibleTypes<keyof DeclaredTypeSet>
    >,
    declaredTypeSet?: Exact<DeclaredTypeSet, TypeSet<DeclaredTypeSet>>
) => null as ParseType<Definition, DeclaredTypeSet>

const result = parse({ a: "boolean" }, { boolen: "any" })

export const createTypeSet = <Definitions extends any[]>(
    ...definitions: TypeDefinitions<Definitions>
) =>
    [] as any as {
        types: ParseDefinitions<Definitions>
    }

const { types } = createTypeSet(
    { user: { b: "user", c: "boolean" } },
    { b: { c: "user" } },
    "user"
)
