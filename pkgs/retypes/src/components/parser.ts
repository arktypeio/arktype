import { ValueOf } from "@re-do/utils"
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
import { typeDefProxy } from "../common.js"
import { unknownTypeError } from "../errors.js"
import type {
    ExtractableDefinition,
    Root,
    UnvalidatedTypeSet
} from "./common.js"
import { Shallow } from "./shallow/shallow.js"

export type MatchesArgs<DefType> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
}

export type ParseContext<DefType> = {
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
    depth: number
}

export type ParseArgs<DefType> = [
    definition: DefType,
    context: ParseContext<DefType>
]

export type AllowsOptions = {
    ignoreExtraneousKeys?: boolean
}

export type ParseInputArgs<DefType> = {
    definition: DefType
    context: ParseContext<DefType>
}

export type AllowsArgs<DefType> = ParseInputArgs<DefType> & {
    assignment: ExtractableDefinition
    ignoreExtraneousKeys?: boolean
}

export type ReferencesOptions = {
    includeBuiltIn?: boolean
}

export type ReferencesArgs<DefType> = ParseInputArgs<DefType> & {
    includeBuiltIn?: boolean
}

export type GetDefaultOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

export type GetDefaultArgs<DefType> = ParseInputArgs<DefType> &
    GetDefaultOptions

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
    children?: () => Children
    // What to do if no children match (defaults to throwing unparsable error)
    fallback?: (...args: ParseArgs<DefType>) => any
} & InheritableParserMethods<DefType, Parent, Children>

export type DefinitionMatcher<Parent> = Parent extends ParentParser<
    infer ParentDef
>
    ? (...args: ParseArgs<ParentDef>) => boolean
    : never

export type InheritableParserMethods<
    DefType,
    Parent,
    Children,
    Unimplemented = UnimplementedParserMethods<DefType, Parent>
> = Children extends never[]
    ? { implements: Unimplemented }
    : { implements?: Partial<Unimplemented> }
// Children extends never[]
// ? {
//       parse: (
//           definition: DefType,
//           context: ParseContext<DefType>
//       ) => Unimplemented
//   }
// : {
//       parse?: (
//           definition: DefType,
//           context: ParseContext<DefType>
//       ) => Partial<Unimplemented>
//   }

export type UnimplementedParserMethods<DefType, Parent> = Omit<
    ParserInputMethods<DefType>,
    Unlisted<GetInheritedMethods<Parent>>
>

export type ParserInputMethods<DefType> = {
    allows: (
        ...args: [
            ...args: ParseArgs<DefType>,
            assignment: ExtractableDefinition,
            options: AllowsOptions
        ]
    ) => ValidationErrors
    references: (
        ...args: [...args: ParseArgs<DefType>, options: ReferencesOptions]
    ) => Shallow.Definition[]
    getDefault: (
        ...args: [...args: ParseArgs<DefType>, options: GetDefaultOptions]
    ) => any
}

export type ParseFunction<DefType> = (...args: ParseArgs<DefType>) => {
    definition: DefType
    matches: boolean
} & {
    [MethodName in keyof ParserInputMethods<DefType>]: InputToParseMethod<
        ParserInputMethods<DefType>[MethodName]
    >
}

export type InputToParseMethod<
    Method extends ValueOf<ParserInputMethods<any>>
> = Method extends (
    ...args: [infer Definition, infer Context, ...infer Rest, infer Opts]
) => infer Return
    ? (...args: [...rest: Rest, opts?: Opts]) => Return
    : Method

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
    } & ParseFunction<DefType>
>

export type ParserMethodName = keyof ParserInputMethods<any>

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
    config: ToolbeltFunction.Exact<
        Input,
        ParserInput<DefType, Parent, Children>
    >
): Parser<DefType, Parent, KeyValuate<Input, "implements">> => {
    const input = config as ParserInput<DefType, Parent, Children>
    const validatedChildren: AnyParser[] = (input.children?.() as any) ?? []
    const parse = (definition: DefType, context: ParseContext<DefType>) => {
        const args: ParseArgs<DefType> = [
            definition,
            { ...context, depth: context.depth + 1 }
        ]
        let matchingChild: AnyParser
        if (validatedChildren.length) {
            const match = validatedChildren.find(
                (child) => child(...args).matches
            )
            if (!match) {
                if (input.fallback) {
                    return input.fallback(...args)
                }
                throw new Error(unknownTypeError(definition))
            }
            matchingChild = match
        }
        const methods: ParserInputMethods<DefType> = transform(
            parserMethodNames,
            ([i, methodName]) => {
                const implemented: Partial<ParserInputMethods<DefType>> =
                    input.implements ?? {}
                if (implemented?.[methodName]) {
                    return [methodName, implemented[methodName]]
                }
                return [methodName, matchingChild(...args)[methodName]]
            }
        )
        return {
            matches: input.matches(...args),
            definition,
            ...methods
        }
    }
    return Object.assign(parse, {
        meta: {}
    }) as any
}
