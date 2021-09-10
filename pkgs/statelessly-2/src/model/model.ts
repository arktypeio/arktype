import {
    ExcludeByValue,
    FilterByValue,
    Narrow,
    Exact,
    NonRecursible,
    Merge,
    Key,
    ValueOf,
    ValueFrom,
    Unlisted
} from "@re-do/utils"
import { ParseTypeSet, Evaluate } from "../createTypes"
import { TypeDefinition, ValidatedObjectDef } from ".."

export const define = <Name extends string, Definition>(
    name: Name,
    definition: Narrow<Definition>
) => [name, definition] as [Name, Definition]

type EntryIteration<Current extends Entry, Remaining extends Entry[]> = [
    Current,
    ...Remaining
]

type FromEntries<
    Entries extends Entry[],
    Result extends object = {}
> = Entries extends EntryIteration<infer Current, infer Remaining>
    ? FromEntries<Remaining, Merge<Result, { [K in Current[0]]: Current[1] }>>
    : Result

type ParseModel<Definitions extends Entry[]> = Evaluate<
    ParseTypeSet<FromEntries<Definitions>>
>

const model = <Definitions extends Entry[]>(...definitions: Definitions) =>
    Object.fromEntries(definitions) as Evaluate<
        ParseTypeSet<FromEntries<Definitions>>
    >

type Entry<K extends Key = Key, V = any> = [K, V]

type KeyOfEntries<
    Entries extends Entry[],
    Result = never
> = Entries extends EntryIteration<infer Current, infer Remaining>
    ? KeyOfEntries<Remaining, Result | Current[0]>
    : Result

type ModeledTypeName<Definitions extends Entry[]> = Extract<
    KeyOfEntries<Definitions>,
    string
>

export const createModel = <
    Definitions extends Entry[],
    DefinedTypeName extends string = ModeledTypeName<Definitions>
>(
    ...definitions: Definitions
) => ({
    define: <
        Name extends string,
        Definition extends ValidatedObjectDef<DefinedTypeName, Definition>
    >(
        name: Name,
        definition: Narrow<Definition>
    ) => [name, definition] as [Name, Definition]
})

export const declare = <TypeNames extends string[]>(...args: TypeNames) =>
    Object.fromEntries(
        args.map((typeName) => [
            typeName,
            {
                as: (definition: any) => [typeName, definition]
            }
        ])
    ) as {
        [TypeName in Unlisted<TypeNames>]: {
            as: <
                Definition extends ValidatedObjectDef<
                    Unlisted<TypeNames>,
                    Definition
                >
            >(
                definition: Narrow<Definition>
            ) => Definition
        }
    }
