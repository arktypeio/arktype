import {
    Narrow,
    Evaluate,
    ListPossibleTypes,
    Exact,
    mergeAll,
    transform
} from "@re-do/utils"
import {
    TypeDefinition,
    TypeSet,
    TypeSetFromDefinitions,
    createDefineFunctionMap,
    TypeSetDefinitions,
    DefineFunctionMap
} from "./definitions.js"
import { typeDefProxy, UnvalidatedTypeSet, formatTypes } from "./common.js"
import { ParseType, ParseTypeOptions } from "./parse.js"
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
        options?: Narrow<
            ParseOptions & {
                typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
            }
        >
    ) => {
        const formattedDefinition = formatTypes(definition)
        const activeTypeSet = options?.typeSet ?? predefinedTypeSet
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
    <
        Definitions extends any[],
        MergedTypeSet extends UnvalidatedTypeSet = TypeSetFromDefinitions<Definitions>
    >(
        ...definitions: TypeSetDefinitions<Definitions, DeclaredTypeNames>
    ) => {
        const typeSetFromDefinitions = formatTypes(
            mergeAll(...(definitions as any))
        ) as MergedTypeSet
        const parse = createParseFunction(typeSetFromDefinitions)
        return {
            parse,
            types: transform(
                typeSetFromDefinitions as any,
                ([typeName, definition]) => [
                    typeName,
                    parse(definition, {
                        typeSet: typeSetFromDefinitions as any
                    })
                ]
            ) as {
                [TypeName in keyof MergedTypeSet]: Evaluate<
                    ParsedType<MergedTypeSet[TypeName], MergedTypeSet, {}>
                >
            }
        }
    }

export type Declaration<DeclaredTypeNames extends string[]> = {
    define: DefineFunctionMap<DeclaredTypeNames>
    compile: CompileFunction<DeclaredTypeNames>
}

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Definitions extends any[]
>(
    ...definitions: TypeSetDefinitions<Definitions, DeclaredTypeNames>
) => CompiledTypeSet<Definitions>

export type CompiledTypeSet<
    Definitions extends any[],
    MergedTypeSet extends UnvalidatedTypeSet = TypeSetFromDefinitions<Definitions>
> = {
    parse: ParseFunction<MergedTypeSet>
    types: {
        [TypeName in keyof MergedTypeSet]: Evaluate<
            ParsedType<MergedTypeSet[TypeName], MergedTypeSet, {}>
        >
    }
}

export type ParseFunction<PredefinedTypeSet extends UnvalidatedTypeSet> = <
    Definition,
    Options extends ParseTypeOptions,
    ActiveTypeSet = PredefinedTypeSet
>(
    definition: TypeDefinition<
        Narrow<Definition>,
        ListPossibleTypes<keyof ActiveTypeSet>
    >,
    options?: Narrow<
        Options & {
            typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
        }
    >
) => ParsedType<Definition, ActiveTypeSet, Options>

export type ParsedType<
    Definition,
    TypeSet,
    Options,
    ParseResult = ParseType<Definition, TypeSet, Options>
> = {
    definition: Definition
    type: ParseResult
    typeSet: Evaluate<TypeSet>
    checkErrors: (value: unknown, options?: ValidateOptions) => string
    assert: (value: unknown, options?: ValidateOptions) => void
    getDefault: (options?: GetDefaultOptions) => ParseResult
}

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: createCompileFunction(names)
})

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const { compile } = declare()

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const parse = createParseFunction({})
