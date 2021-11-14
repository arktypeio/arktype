import {
    DiffUnions,
    ElementOf,
    Evaluate,
    // Exact,
    ExcludeByValue,
    Func,
    KeyValuate,
    ListPossibleTypes,
    memoize,
    narrow,
    RequiredKeys,
    stringify,
    StringifyPossibleTypes,
    transform,
    Unlisted
} from "@re-do/utils"
import { Function as ToolbeltFunction } from "ts-toolbelt"
import type {
    ExtractableDefinition,
    Root,
    UnvalidatedTypeSet
} from "./common.js"

export type MatchesArgs<DefType> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
}

export type ParseArgs<DefType> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
}

export type AllowsOptions = {
    ignoreExtraneousKeys?: boolean
}

export type ReferencesOptions = {
    includeBuiltIn?: boolean
}

export type GetDefaultOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ParentParser<
    DefType = unknown,
    Inherits extends ParserMethodName[] = ParserMethodName[],
    Implements extends ParserMethodName[] = ParserMethodName[]
> = {
    meta: {
        type: DefType
        inherits: Inherits
        implements: Implements
    }
}

export type ParserInput<DefType, Parent, Children extends DefType[]> = {
    type: DefType
    parent: () => Parent
    matches: DefinitionMatcher<Parent>
    children?: Children
} & ImplementsValue<DefType, Parent, Children>

export type DefinitionMatcher<Parent> = Parent extends ParentParser<
    infer ParentDef
>
    ? (args: MatchesArgs<ParentDef>) => boolean
    : never

export type ImplementsValue<
    DefType,
    Parent,
    Children,
    Unimplemented = UnimplementedParserMethods<DefType, Parent>
> = Children extends never[]
    ? { implements: Required<Unimplemented> }
    : { implements?: Unimplemented }

export type UnimplementedParserMethods<DefType, Parent> = Omit<
    InheritableParserMethods<DefType>,
    Unlisted<GetInheritedMethods<Parent>>
>

export type InheritableParserMethods<DefType> = {
    [MethodName in ParserMethodName]?: WithParseArgs<
        ParserMethods<DefType>[MethodName],
        DefType
    >
}

export type WithParseArgs<
    ParserMethod extends Func,
    DefType
> = ParserMethod extends Func<[...infer MainArgs, infer Options], infer Return>
    ? (
          ...args: [...main: MainArgs, options: Options & ParseArgs<DefType>]
      ) => Return
    : never

export type ParserMethods<DefType> = {
    allows: (
        assignmentFrom: ExtractableDefinition,
        options?: AllowsOptions
    ) => ValidationErrors
    references: (options?: ReferencesOptions) => any
    getDefault: (options?: GetDefaultOptions) => any
}

export type GetInheritedMethods<Parent> = Parent extends ParentParser<
    unknown,
    infer Inherits,
    infer Implements
>
    ? [...Inherits, ...Implements]
    : []

export type ParserMetadata<
    DefType,
    Parent,
    Methods,
    Inherits extends ParserMethodName[] = GetInheritedMethods<Parent>,
    Implements extends ParserMethodName[] = ListPossibleTypes<
        RequiredKeys<Methods>
    >,
    Delegates extends ParserMethodName[] = ListPossibleTypes<
        Exclude<ParserMethodName, Unlisted<Inherits> | Unlisted<Implements>>
    >
> = Evaluate<{
    type: DefType
    inherits: Inherits
    implements: Implements
    delegates: Delegates
}>

export type Parser<DefType, Parent, Methods> = Evaluate<
    {
        meta: ParserMetadata<DefType, Parent, Methods>
    } & ((args: ParseArgs<DefType>) => ParserMethods<DefType> & {
        matches: boolean
    })
>

export type ParserMethodName = keyof ParserMethods<any>

const parserMethodNames: ListPossibleTypes<ParserMethodName> = [
    "allows",
    "references",
    "getDefault"
]

// Re:Root, reroot its root by rerouting to reroot
export const reroot = {
    meta: {
        type: {} as Root.Definition,
        inherits: [] as [],
        implements: [] as [],
        delegates: parserMethodNames
    }
}

type AnyParser = Parser<any, any, any>

export const createParser = <
    Input,
    DefType,
    Parent,
    Children extends DefType[] = []
>(
    args: ToolbeltFunction.Exact<Input, ParserInput<DefType, Parent, Children>>
): Parser<DefType, Parent, KeyValuate<Input, "implements">> => {
    const input = args as ParserInput<DefType, Parent, Children>
    const parse = (args: ParseArgs<DefType>) => {
        const validatedChildren = input.children as any as AnyParser[]
        const methods: ParserMethods<DefType> = transform(
            parserMethodNames,
            ([i, methodName]) => {
                const implemented =
                    input.implements as InheritableParserMethods<DefType>
                if (implemented?.[methodName]) {
                    return [methodName, implemented[methodName]]
                }
                const delegated = validatedChildren.find(
                    (child) => child(args).matches
                )
                if (!delegated) {
                    throw new Error(
                        `None of ${stringify(
                            validatedChildren
                        )} provides a matching parser for ${args.definition}.`
                    )
                }
                return [methodName, delegated(args)[methodName]]
            }
        )
        return {
            matches: input.matches(args),
            ...methods
        }
    }
    return Object.assign(parse, {
        meta: {}
    }) as any
}

export const createDelegate = <DefType>(parser: DefType) => parser
