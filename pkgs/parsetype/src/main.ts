import {
    Evaluate,
    ListPossibleTypes,
    Exact,
    Narrow,
    mergeAll
} from "@re-do/utils"
import {
    TypeDefinition,
    TypeSet,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    TypeSetDefinitions
} from "./definitions.js"
import { typeDefProxy, UnvalidatedTypeSet, formatTypes } from "./common.js"
import { ParseType, ParseTypeSetDefinitions } from "./parse.js"
import { validate, assert, ValidateOptions } from "./validate.js"

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
                    validate: (value: unknown, options: ValidateOptions = {}) =>
                        validate(
                            value,
                            formattedDefinition,
                            activeTypeSet,
                            options
                        ),
                    assert: (value: unknown, options: ValidateOptions = {}) =>
                        assert(
                            value,
                            formattedDefinition,
                            activeTypeSet,
                            options
                        )
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
