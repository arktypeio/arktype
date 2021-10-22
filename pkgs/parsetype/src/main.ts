import {
    Narrow,
    Evaluate,
    ListPossibleTypes,
    Exact,
    mergeAll,
    DeepEvaluate
} from "@re-do/utils"
import {
    TypeDefinition,
    TypeSet,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    TypeSetDefinitions
} from "./definitions.js"
import { typeDefProxy, UnvalidatedTypeSet, formatTypes } from "./common.js"
import {
    ParseType,
    ParseTypeOptions,
    ParseTypeSetDefinitions
} from "./parse.js"
import { checkErrors, assert, ValidateOptions } from "./validate.js"
import { getDefault, GetDefaultOptions } from "./defaults.js"

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
                ParseOptions extends ParseTypeOptions,
                ActiveTypeSet = TypeSetFromDefinitions<Definitions>
            >(
                definition: TypeDefinition<
                    Narrow<Definition>,
                    ListPossibleTypes<keyof ActiveTypeSet>
                >,
                typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>,
                options?: DeepEvaluate<Narrow<ParseOptions>>
            ) => {
                const formattedDefinition = formatTypes(definition)
                const activeTypeSet = typeSet ?? typeSetFromDefinitions
                return {
                    definition: formattedDefinition,
                    type: typeDefProxy as ParseType<
                        Definition,
                        ActiveTypeSet,
                        ParseOptions
                    >,
                    typeSet: activeTypeSet,
                    checkErrors: (
                        value: unknown,
                        options: ValidateOptions = {}
                    ) =>
                        checkErrors(
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
                        ),
                    getDefault: (options: GetDefaultOptions = {}) =>
                        getDefault(
                            formattedDefinition,
                            activeTypeSet,
                            options
                        ) as ParseType<Definition, ActiveTypeSet, ParseOptions>,
                    options: options
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
