import {
    Evaluate,
    isRecursible,
    mergeAll,
    Narrow,
    transform
} from "@re-do/utils"
import { createParseFunction, parse, ParseFunction } from "../parse.js"
import { TypeSet } from "./typeSet.js"

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(names: Narrow<DeclaredTypeNames>) =>
    <
        Definitions extends TypeSet.ValidateMemberList<
            Definitions,
            DeclaredTypeNames
        >
    >(
        // @ts-ignore
        ...definitions: Narrow<Definitions>
    ) => {
        if (
            !Array.isArray(definitions) ||
            definitions.some((def) => !isRecursible(def) || Array.isArray(def))
        ) {
            throw new Error(`Compile args must be a list of names mapped to their corresponding definitions
            passed as rest args, e.g.:
            compile(
                { user: { name: "string" } },
                { group: "user[]" }
            )`)
        }
        const typeSetFromDefinitions = mergeAll(definitions as any) as any
        const parse = createParseFunction(typeSetFromDefinitions) as any
        return {
            parse,
            types: transform(
                typeSetFromDefinitions,
                ([typeName, definition]) => [
                    typeName,
                    // @ts-ignore
                    parse(definition, {
                        // @ts-ignore
                        typeSet: typeSetFromDefinitions
                    })
                ]
            )
        } as CompiledTypeSet<Definitions>
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Definitions extends TypeSet.ValidateMemberList<Definitions>
>(
    // @ts-ignore
    ...definitions: Narrow<Definitions>
) => CompiledTypeSet<Definitions>

export type CompiledTypeSet<
    Definitions,
    MergedTypeSet = TypeSet.MergeMemberList<Definitions>
> = Evaluate<{
    parse: ParseFunction<MergedTypeSet>
    types: TypeSet.Parse<MergedTypeSet>
}>
