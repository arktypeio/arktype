import {
    Evaluate,
    ListPossibleTypes,
    Exact,
    Narrow,
    mergeAll,
    deepMap,
    transform
} from "@re-do/utils"
import {
    TypeDefinition,
    TypeSet,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    TypeSetDefinitions
} from "./definitions.js"
import {
    typeDefProxy,
    UnvalidatedDefinition,
    UnvalidatedTypeSet
} from "./common.js"
import { ParseType, ParseTypeSetDefinitions } from "./parse.js"
import { satisfies, typeOf } from "./validate.js"

export const formatTypes = <T>(definition: T): T => {
    if (typeof definition === "string") {
        return definition.replace(" ", "") as any
    }
    if (typeof definition === "object") {
        return transform(definition as any, ([k, v]) => [
            k,
            formatTypes(v)
        ]) as any
    }
    throw new Error(
        `Unable to parse definition '${definition}' of type '${typeof definition}'. ` +
            `Definition must be strings or objects.`
    )
}

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: <Definitions extends any[]>(
        ...definitions: TypeSetDefinitions<Definitions, DeclaredTypeNames>
    ) => {
        const typeSetFromDefinitions: UnvalidatedTypeSet = formatTypes(
            mergeAll(definitions)
        )
        return {
            parse: <
                Definition,
                ActiveTypeSet = TypeSetFromDefinitions<Definitions>
            >(
                definition: TypeDefinition<
                    Narrow<Definition>,
                    ListPossibleTypes<keyof ActiveTypeSet>
                >,
                typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
            ) => {
                const formattedDefinition = formatTypes(definition)
                const activeTypeSet = typeSet ?? typeSetFromDefinitions
                return {
                    definition: formattedDefinition,
                    type: typeDefProxy as ParseType<Definition, ActiveTypeSet>,
                    typeSet: activeTypeSet,
                    validate: (value: unknown) => {
                        return satisfies(
                            typeOf(value),
                            formattedDefinition,
                            activeTypeSet
                        )
                    }
                }
            },
            types: typeDefProxy as Evaluate<
                ParseTypeSetDefinitions<Definitions>
            >
        }
    }
})

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const { compile } = declare()

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const { parse } = compile()
