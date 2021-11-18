import { Evaluate, MergeAll, Narrow, Exact, TreeOf } from "@re-do/utils"
import { UnvalidatedTypeSet } from "./common.js"
import { TypeSet } from "./compile.js"
import { Parse, Validate } from "./definition.js"
import { Root } from "./components"
import {
    AllowsOptions,
    ParseContext,
    ReferencesOptions,
    GenerateOptions
} from "./components/parser.js"
import { ValidationErrors } from "./components/errors.js"

export type ParseTypeRecurseOptions = Required<ParseTypeOptions>

export type ParseTypeOptions = {
    onCycle?: Root.Definition
    seen?: any
    deepOnCycle?: boolean
    onResolve?: Root.Definition
}

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

export const createParseFunction =
    <PredefinedTypeSet extends UnvalidatedTypeSet>(
        predefinedTypeSet: Narrow<PredefinedTypeSet>
    ) =>
    <
        Def,
        ParseOptions extends ParseTypeOptions,
        ActiveTypeSet = PredefinedTypeSet
    >(
        definition: Validate<Narrow<Def>, keyof ActiveTypeSet & string>,
        options?: Narrow<
            ParseOptions & {
                typeSet?: Exact<ActiveTypeSet, TypeSet<ActiveTypeSet>>
            }
        >
    ) => {
        const activeTypeSet = options?.typeSet ?? predefinedTypeSet
        const context: ParseContext<any> = {
            typeSet: activeTypeSet,
            path: [],
            seen: [],
            depth: 0
        }
        return Root.parse(definition, context) as any as Evaluate<
            ParsedType<
                Def,
                ActiveTypeSet,
                ParseOptions,
                Parse<Def, ActiveTypeSet, ParseOptions>
            >
        >
    }

// Exported parse function is equivalent to parse from an empty compile call,
// but optionally accepts a typeset as its second parameter
export const parse = createParseFunction({})

export type ParseTypeSet<TypeSet, Options extends ParseTypeOptions = {}> = {
    [TypeName in keyof TypeSet]: Parse<TypeName, TypeSet, Options>
}

export type ParseTypeSetDefinitions<
    Definitions,
    Options extends ParseTypeOptions = {}
> = ParseTypeSet<MergeAll<Definitions>, Options>

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
        ? Root.Definition
        : Validate<Narrow<Definition>, keyof ActiveTypeSet & string>,
    options?: Narrow<
        Options & {
            typeSet?: Exact<Narrow<ActiveTypeSet>, TypeSet<ActiveTypeSet>>
        }
    >
) => Evaluate<
    UnvalidatedTypeSet extends ActiveTypeSet
        ? ParsedType
        : ParsedType<Definition, ActiveTypeSet, Options>
>

export type ParsedType<
    Definition = Root.Definition,
    TypeSet = UnvalidatedTypeSet,
    Options = {},
    TypeOfParsed = Root.Definition extends Definition
        ? any
        : Parse<Definition, TypeSet, Options>
> = {
    definition: Definition
    type: TypeOfParsed
    typeSet: Evaluate<TypeSet>
    check: (value: unknown, options?: AllowsOptions) => string
    assert: (value: unknown, options?: AllowsOptions) => void
    allows: (value: unknown, options?: AllowsOptions) => ValidationErrors
    generate: (options?: GenerateOptions) => TypeOfParsed
    references: (options?: ReferencesOptions) => TreeOf<string[], true>
}
