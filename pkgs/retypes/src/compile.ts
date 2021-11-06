import { ElementOf, mergeAll, Narrow, transform } from "@re-do/utils"
import {
    formatTypes,
    UnvalidatedObjectDefinition,
    UnvalidatedTypeSet
} from "./common.js"
import { TypeSetDefinitions, TypeSetFromDefinitions } from "./definitions.js"
import { createParseFunction, ParseFunction, ParsedTypeSet } from "./parse.js"

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(names: Narrow<DeclaredTypeNames>) =>
    <
        Definitions extends any[],
        MergedTypeSet extends UnvalidatedTypeSet = TypeSetFromDefinitions<Definitions>
    >(
        ...definitions: [] extends DeclaredTypeNames
            ? TypeSetDefinitions<Definitions>
            : TypeSetDefinitions<Definitions, ElementOf<DeclaredTypeNames>>
    ) => {
        const typeSetFromDefinitions = formatTypes(
            mergeAll(definitions as any)
        ) as MergedTypeSet
        const parse = createParseFunction(typeSetFromDefinitions)
        return {
            parse,
            types: transform(
                typeSetFromDefinitions as any,
                ([typeName, definition]) => [
                    typeName,
                    // @ts-ignore
                    parse(definition, {
                        // @ts-ignore
                        typeSet: typeSetFromDefinitions
                    })
                ]
            ) as ParsedTypeSet<MergedTypeSet>
        }
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type CompileFunction<DeclaredTypeNames extends string[] = []> = <
    Definitions extends any[]
>(
    ...definitions: [] extends DeclaredTypeNames
        ? TypeSetDefinitions<Definitions>
        : TypeSetDefinitions<Definitions, ElementOf<DeclaredTypeNames>>
) => CompiledTypeSet<Definitions>

export type CompiledTypeSet<
    Definitions extends UnvalidatedObjectDefinition[] = UnvalidatedObjectDefinition[],
    MergedTypeSet extends UnvalidatedTypeSet = UnvalidatedObjectDefinition[] extends Definitions
        ? UnvalidatedTypeSet
        : TypeSetFromDefinitions<Definitions>
> = {
    parse: ParseFunction<MergedTypeSet>
    types: ParsedTypeSet<MergedTypeSet>
}
