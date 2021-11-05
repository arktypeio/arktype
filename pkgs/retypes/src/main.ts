import {
    Narrow,
    Evaluate,
    ListPossibleTypes,
    Exact,
    mergeAll,
    transform,
    ElementOf,
    NonRecursible,
    DeepEvaluate,
    List,
    CastWithExclusion
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
    UnvalidatedDefinition,
    UnvalidatedObjectDefinition
} from "./common.js"
import { ParseType, ParseTypeOptions } from "./parse.js"
import { checkErrors, assert, ValidateOptions } from "./validate.js"
import { getDefault, GetDefaultOptions } from "./defaults.js"

type DeepListPossibleTypes<T> = {
    [K in keyof T]: T[K] extends NonRecursible
        ? ListPossibleTypes<T[K]>
        : DeepListPossibleTypes<T[K]>
}

type ExtractedReferences<Definition, ActiveTypeSet> = DeepEvaluate<
    DeepListPossibleTypes<
        TypeDefinition<
            Definition,
            keyof ActiveTypeSet & string,
            { extractTypesReferenced: true }
        >
    >
>

const extractReferences = <Definition, ActiveTypeSet>(
    definition: TypeDefinition<
        Narrow<Definition>,
        keyof ActiveTypeSet & string
    >,
    typeSet: Narrow<ActiveTypeSet>
): ExtractedReferences<Definition, ActiveTypeSet> => {
    return {} as any
}

const f = extractReferences(
    { a: { b: { c: "(a)=>c", d: ["b", "a", "string"] }, e: "c|a" } },
    { a: 0, b: 0, c: 0 }
)

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
            keyof ActiveTypeSet & string
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
            typeSet: activeTypeSet as ActiveTypeSet,
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
        ...definitions: DeclaredTypeNames extends []
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
                    parse(definition, {
                        typeSet: typeSetFromDefinitions as any
                    })
                ]
            ) as ParsedTypeSet<MergedTypeSet>
        }
    }

export type Declaration<DeclaredTypeName extends string = string> = {
    define: DefineFunctionMap<DeclaredTypeName>
    compile: CompileFunction<DeclaredTypeName>
}

export type CompileFunction<DeclaredTypeName extends string = never> = <
    Definitions extends any[]
>(
    ...definitions: DeclaredTypeName extends never
        ? TypeSetDefinitions<Definitions>
        : TypeSetDefinitions<Definitions, DeclaredTypeName>
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

export type ParsedTypeSet<TypeSet = UnvalidatedTypeSet> =
    UnvalidatedTypeSet extends TypeSet
        ? Record<string, ParsedType>
        : {
              [TypeName in keyof TypeSet]: Evaluate<
                  ParsedType<TypeName, TypeSet, {}>
              >
          }

export type ParseFunction<
    PredefinedTypeSet extends UnvalidatedTypeSet = UnvalidatedTypeSet
> = <
    Definition,
    Options extends ParseTypeOptions,
    ActiveTypeSet = PredefinedTypeSet
>(
    definition: UnvalidatedTypeSet extends ActiveTypeSet
        ? UnvalidatedDefinition
        : TypeDefinition<Narrow<Definition>, keyof ActiveTypeSet & string>,
    options?: Narrow<
        Options & {
            typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
        }
    >
) => UnvalidatedTypeSet extends ActiveTypeSet
    ? ParsedType
    : ParsedType<Definition, ActiveTypeSet, Options>

export type ParsedType<
    Definition = UnvalidatedDefinition,
    TypeSet = UnvalidatedTypeSet,
    Options = {},
    ParseResult = UnvalidatedDefinition extends Definition
        ? any
        : ParseType<Definition, TypeSet, Options>
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
