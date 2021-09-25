import { MergeAll } from "./common"
import {
    Narrow,
    ElementOf,
    ListPossibleTypes,
    Evaluate,
    StringifyPossibleTypes,
    Cast
} from "@re-do/utils"
import { ParseType } from "./parse"
import { Diff, DiffResult } from "./common"
import {
    ValidateTypeDefinition,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    UnvalidatedObjectDefinition
} from "./validate"

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
    // to ensure a valid Diff result
    DeclaredTypeName extends string = ElementOf<
        DeclaredTypeNames extends [] ? DefinedTypeNames : DeclaredTypeNames
    >
> = {
    [Index in keyof Definitions]: ValidateTypeDefinition<
        Definitions[Index],
        ListPossibleTypes<DefinedTypeName>,
        DeclaredTypeName
    > &
        UnvalidatedObjectDefinition
} &
    MissingTypesError<DeclaredTypeName, DefinedTypeName>

export type ParseTypeSetDefinitions<
    Definitions,
    Merged = MergeAll<Definitions>
> = {
    [TypeName in keyof Merged]: ParseType<Merged[TypeName], Merged>
}

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
            DeclaredTypeSet = TypeSetFromDefinitions<Definitions>
        >(
            definition: ValidateTypeDefinition<
                Definition,
                ListPossibleTypes<keyof DeclaredTypeSet>
            >
        ) => null as ParseType<Definition, DeclaredTypeSet>,
        types: {} as Evaluate<ParseTypeSetDefinitions<Definitions>>
    })
})

export const { compile } = declare()

const { types } = compile({ a: "boolean" })

//     <
//     Definitions extends any[],
//     DeclaredTypeNames extends string[] = []
// >(
//     ...definitions: ValidateTypeSetDefinitions<Definitions, DeclaredTypeNames>
// ) => ({
//     parse: <Definition, DeclaredTypeSet = TypeSetFromDefinitions<Definitions>>(
//         definition: ValidateTypeDefinition<
//             Definition,
//             ListPossibleTypes<keyof DeclaredTypeSet>
//         >
//     ) => null as ParseType<Definition, DeclaredTypeSet>,
//     types: {} as Evaluate<ParseTypeSetDefinitions<Definitions>>
// })
