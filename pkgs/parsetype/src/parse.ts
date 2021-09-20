import {
    ExcludeByValue,
    FilterByValue,
    TypeError,
    Evaluate,
    Narrow
} from "@re-do/utils"
import { TypeSet, ObjectDefinition, TypeDefinition } from "./define"
import {
    GroupedType,
    OrType,
    ListType,
    OptionalType,
    BuiltInType,
    BuiltInTypeMap,
    MergeAll,
    Merge
} from "./common"

type ParseStringDefinition<
    TypeSet,
    PropDefinition extends string
> = PropDefinition extends OptionalType<infer OptionalType>
    ? ParseStringDefinitionRecurse<TypeSet, OptionalType> | undefined
    : ParseStringDefinitionRecurse<TypeSet, PropDefinition>

type ParseStringDefinitionRecurse<
    TypeSet,
    PropDefinition extends string
> = PropDefinition extends GroupedType<infer Group>
    ? ParseStringDefinitionRecurse<TypeSet, Group>
    : PropDefinition extends ListType<infer ListItem>
    ? ParseStringDefinitionRecurse<TypeSet, ListItem>[]
    : PropDefinition extends OrType<infer First, infer Second>
    ?
          | ParseStringDefinitionRecurse<TypeSet, First>
          | ParseStringDefinitionRecurse<TypeSet, Second>
    : PropDefinition extends keyof TypeSet
    ? ParseType<TypeSet, TypeSet[PropDefinition]>
    : PropDefinition extends BuiltInType
    ? BuiltInTypeMap[PropDefinition]
    : TypeError<`Unable to parse the type of '${PropDefinition}'.`>

type ParseObjectDefinition<TypeSet, Definition extends object> = {
    [PropName in keyof ExcludeByValue<Definition, OptionalType>]: ParseType<
        TypeSet,
        Definition[PropName]
    >
} &
    {
        [PropName in keyof FilterByValue<
            Definition,
            OptionalType
        >]?: Definition[PropName] extends OptionalType<infer OptionalType>
            ? ParseType<TypeSet, OptionalType>
            : TypeError<`Expected property ${Extract<
                  PropName,
                  string | number
              >} to be optional.`>
    }

export type ParseTypeSet<
    Definitions,
    Merged = MergeAll<Definitions>
> = Evaluate<
    {
        [TypeName in keyof Merged]: ParseType<Merged, Merged[TypeName]>
    }
>

export type ParseType<TypeSet, Definition> = Definition extends string
    ? ParseStringDefinition<TypeSet, Definition>
    : Definition extends object
    ? Evaluate<ParseObjectDefinition<TypeSet, Definition>>
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
//     DeclaredTypeName extends string
// > = {
//     [K in keyof Definition]: TypeDefinition<Definition[K], DeclaredTypeName>
// }

// export const parse = <
//     Definition extends ParsableTypeDefinition<
//         Definition,
//         Extract<keyof DeclaredTypeSet, string>
//     >,
//     DeclaredTypeSet extends TypeSet<DeclaredTypeSet>
// >(
//     definition: Narrow<Definition>,
//     declaredTypeSet?: DeclaredTypeSet
// ) => [] as any as ParseType<DeclaredTypeSet, Definition>

// parse({ a: "string" })

export const createTypeSet = <Definitions extends TypeSet<Definitions>>(
    definitions: Narrow<Definitions>
) =>
    [] as any as {
        types: ParseTypeSet<Definitions>
    }

createTypeSet([{ user: { b: "user" }, b: { c: "user" } }])
