import {
    ExcludeByValue,
    FilterByValue,
    TypeError,
    Evaluate,
    ListPossibleTypes,
    Exact,
    Narrow,
    IsUnknown,
    MergeAll
} from "@re-do/utils"
import {
    ValidateTypeDefinition,
    ValidateTypeSet,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    ValidateTypeSetDefinitions,
    InvalidTypeDefError
} from "./validate"
import {
    OrDefinition,
    ListDefinition,
    OptionalDefinition,
    BuiltInDefinition,
    BuiltInDefinitionMap,
    ObjectListDefinition,
    ObjectDefinition
} from "./common"

export type ParseStringDefinition<
    Definition extends string,
    TypeSet
> = Definition extends OptionalDefinition<infer OptionalType>
    ? ParseStringDefinitionRecurse<OptionalType, TypeSet> | undefined
    : ParseStringDefinitionRecurse<Definition, TypeSet>

export type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet
> = Fragment extends ListDefinition<infer ListItem>
    ? ParseStringDefinitionRecurse<ListItem, TypeSet>[]
    : Fragment extends OrDefinition<infer First, infer Second>
    ?
          | ParseStringDefinitionRecurse<First, TypeSet>
          | ParseStringDefinitionRecurse<Second, TypeSet>
    : Fragment extends keyof TypeSet
    ? ParseType<TypeSet[Fragment], TypeSet>
    : Fragment extends BuiltInDefinition
    ? BuiltInDefinitionMap[Fragment]
    : TypeError<`Unable to parse the type of '${Fragment}'.`>

export type ParseObjectDefinition<Definition extends object, TypeSet> = {
    [PropName in keyof ExcludeByValue<
        Definition,
        OptionalDefinition
    >]: ParseType<Definition[PropName], TypeSet>
} &
    {
        [PropName in keyof FilterByValue<
            Definition,
            OptionalDefinition
        >]?: Definition[PropName] extends OptionalDefinition<infer OptionalType>
            ? ParseType<OptionalType, TypeSet>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
    }

export type ParseType<Definition, TypeSet> = Definition extends string
    ? ParseStringDefinition<Definition, TypeSet>
    : Definition extends ObjectListDefinition<infer InnerDefinition>
    ? Evaluate<ParseObjectDefinition<InnerDefinition, TypeSet>>[]
    : Definition extends ObjectDefinition<Definition>
    ? Evaluate<ParseObjectDefinition<Definition, TypeSet>>
    : InvalidTypeDefError

export type ParseTypeSetDefinitions<
    Definitions,
    Merged = MergeAll<Definitions>
> = {
    [TypeName in keyof Merged]: ParseType<Merged[TypeName], Merged>
}

export const typeDef: any = new Proxy({}, { get: () => getTypeDef() })

export const getTypeDef = () => typeDef

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: <Definitions extends any[]>(
        ...definitions: ValidateTypeSetDefinitions<
            Definitions,
            DeclaredTypeNames
        >
    ) => ({
        parse: <
            Definition,
            TypeSet,
            CompiledTypeSet = TypeSetFromDefinitions<Definitions>,
            ActiveTypeSet = IsUnknown<TypeSet> extends true
                ? CompiledTypeSet
                : TypeSet
        >(
            definition: ValidateTypeDefinition<
                Narrow<Definition>,
                ListPossibleTypes<keyof ActiveTypeSet>
            >,
            typeSet?: Exact<TypeSet, ValidateTypeSet<TypeSet>>
        ) => typeDef as ParseType<Definition, ActiveTypeSet>,
        types: typeDef as Evaluate<ParseTypeSetDefinitions<Definitions>>
    })
})

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const { compile } = declare()

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const { parse } = compile()
