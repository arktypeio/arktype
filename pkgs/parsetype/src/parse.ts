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
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    BuiltInTypeMap
} from "./common"

export type ParseStringDefinition<
    Definition extends string,
    TypeSet
> = Definition extends OptionalType<infer OptionalType>
    ? ParseStringDefinitionRecurse<OptionalType, TypeSet> | undefined
    : ParseStringDefinitionRecurse<Definition, TypeSet>

export type ParseStringDefinitionRecurse<
    Fragment extends string,
    TypeSet
> = Fragment extends ListType<infer ListItem>
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

export type ParseObjectDefinition<Definition extends object, TypeSet> = {
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

export type ParseType<Definition, TypeSet> = Definition extends string
    ? ParseStringDefinition<Definition, TypeSet>
    : Definition extends object
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
                Definition,
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

const { define, compile: compile2 } = declare("a", "b")
const { parse: parse2 } = compile2(define.a("b"), define.b("false"))
const result = parse2({ f: "a" })
