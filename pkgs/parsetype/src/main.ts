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
    TypeSetDefinitions,
    DefineFunctionMap
} from "./definitions.js"
import {
    typeDefProxy,
    UnvalidatedTypeSet,
    formatTypes,
    UnvalidatedDefinition
} from "./common.js"
import {
    ParseType,
    ParseTypeOptions,
    ParseTypeSetDefinitions
} from "./parse.js"
import { checkErrors, assert, ValidateOptions } from "./validate.js"
import { getDefault, GetDefaultOptions } from "./defaults.js"

const createParseFunction =
    <PredefinedTypeSet extends UnvalidatedTypeSet>(
        predefinedTypeSet: PredefinedTypeSet
    ) =>
    <
        Definition,
        ParseOptions extends ParseTypeOptions,
        ActiveTypeSet = PredefinedTypeSet
    >(
        definition: TypeDefinition<
            Narrow<Definition>,
            ListPossibleTypes<keyof ActiveTypeSet>
        >,
        typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>,
        options?: Narrow<ParseOptions>
    ) => {
        const formattedDefinition = formatTypes(definition)
        const activeTypeSet = typeSet ?? predefinedTypeSet
        return {
            definition: formattedDefinition,
            type: typeDefProxy as ParseType<
                Definition,
                ActiveTypeSet,
                ParseOptions
            >,
            typeSet: activeTypeSet,
            checkErrors: (value: unknown, options: ValidateOptions = {}) =>
                checkErrors(value, formattedDefinition, activeTypeSet, options),
            assert: (value: unknown, options: ValidateOptions = {}) =>
                assert(value, formattedDefinition, activeTypeSet, options),
            getDefault: (options: GetDefaultOptions = {}) =>
                getDefault(
                    formattedDefinition,
                    activeTypeSet,
                    options
                ) as ParseType<Definition, ActiveTypeSet, ParseOptions>
        }
    }

const createCompileFunction =
    <DeclaredTypeNames extends string[]>(names: Narrow<DeclaredTypeNames>) =>
    <Definitions extends any[]>(
        ...definitions: TypeSetDefinitions<Definitions, DeclaredTypeNames>
    ) => {
        const typeSetFromDefinitions = formatTypes(
            mergeAll(definitions)
        ) as TypeSetFromDefinitions<Definitions>
        return {
            parse: createParseFunction(typeSetFromDefinitions),
            types: typeDefProxy as Evaluate<
                ParseTypeSetDefinitions<Definitions>
            >
        }
    }

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: createCompileFunction(names)
})

const __declaration = declare(...([] as string[]))

export type Declaration = typeof __declaration

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const { compile } = declare()

const __compilation = compile(...([] as any[]))

export type Compilation = typeof __compilation

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const parse = createParseFunction({})

const __parsedType = parse(
    {} as UnvalidatedDefinition,
    {} as UnvalidatedTypeSet
)

export type ParsedType = typeof __parsedType
