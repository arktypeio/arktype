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
import { unknownTypeError } from "../errors.js"
import { ValidationResult } from "../validate.js"
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

export type ReferencesOptions = {
    includeBuiltIn?: boolean
}

export type GenerateOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

// export type ParentParser<
//     DefType = unknown,
//     Inherits extends HandlesMethods<DefType, any> = HandlesMethods<
//         DefType,
//         any
//     >,
//     Handles extends HandlesMethods<DefType, any> = HandlesMethods<DefType, any>
// > = {
//     meta: {
//         type: DefType
//         inherits: Inherits
//         handles: Handles
//     }
// }

export type ParserInput<
    DefType,
    Parent,
    Children extends DefType[],
    Fragments
> = {
    type: DefType
    parent: () => { meta: Parent }
    matches: DefinitionMatcher<Parent>
    fragments?: (...args: ParseArgs<DefType>) => Fragments
    children?: () => Children
    // What to do if no children match (defaults to throwing unparsable error)
    fallback?: (...args: ParseArgs<DefType>) => any
}

export type DefinitionMatcher<Parent> = (
    ...args: ParseArgs<KeyValuate<Parent, "type">>
) => boolean

export type HandlesArg<Children, Handles> = Children extends never[]
    ? [handles: Required<Handles>]
    : [handles?: Handles]

export type HandlesContext<DefType, Fragments> = [
    args: {
        def: DefType
        ctx: ParseContext<DefType>
    } & (unknown extends Fragments ? {} : { fragments: Fragments })
]

export type HandlesMethods<DefType, Fragments> = {
    allows?: (
        ...args: [
            ...args: HandlesContext<DefType, Fragments>,
            valueType: ExtractableDefinition,
            options: AllowsOptions
        ]
    ) => ValidationErrors
    references?: (
        ...args: [
            ...args: HandlesContext<DefType, Fragments>,
            options: ReferencesOptions
        ]
    ) => string[]
    generate?: (
        ...args: [
            ...args: HandlesContext<DefType, Fragments>,
            options: GenerateOptions
        ]
    ) => any
}

export type UnhandledMethods<DefType, Parent, Fragments> = Omit<
    HandlesMethods<DefType, Fragments>,
    keyof GetHandledMethods<Parent>
>

export type ParseFunction<DefType> = (
    ...args: ParseArgs<DefType>
) => ParseResult<DefType>

export type ParseResult<DefType> = {
    definition: DefType
    context: ParseContext<DefType>
    matches: boolean
} & {
    [MethodName in ParserMethodName]-?: TransformInputMethod<
        NonNullable<HandlesMethods<DefType, any>[MethodName]>
    >
}

export type TransformInputMethod<
    Method extends ValueOf<HandlesMethods<any, any>>
> = Method extends (...args: [infer ParseResult, ...infer Rest]) => infer Return
    ? (...args: [...rest: Rest]) => Return
    : Method

export type GetHandledMethods<Parent> = KeyValuate<Parent, "inherits"> &
    KeyValuate<Parent, "handles">

export type ParserMetadata<
    DefType,
    Parent,
    Handles extends HandlesMethods<DefType, any>
> = Evaluate<{
    meta: {
        type: DefType
        inherits: GetHandledMethods<Parent>
        handles: unknown extends Handles ? {} : Handles
    }
}>

export type Parser<DefType, Parent, Handles> = Evaluate<
    ParserMetadata<DefType, Parent, Handles> & ParseFunction<DefType>
>

export type ParserMethodName = keyof HandlesMethods<any, any>

const parserMethodNames: ListPossibleTypes<ParserMethodName> = [
    "allows",
    "references",
    "generate"
]

// Re:Root, reroot its root by rerouting to reroot
export const reroot = {
    meta: {
        type: {} as Root.Definition,
        inherits: {},
        handles: {}
    }
}

type AnyParser = Parser<any, any, any>

export const createParser = <
    Input,
    Handles,
    DefType,
    Parent,
    Fragments,
    Children extends DefType[] = []
>(
    ...args: [
        ToolbeltFunction.Exact<
            Input,
            ParserInput<DefType, Parent, Children, Fragments>
        >,
        ...HandlesArg<
            Children,
            ToolbeltFunction.Exact<
                Handles,
                UnhandledMethods<DefType, Parent, Fragments>
            >
        >
    ]
): Parser<DefType, Parent, Handles> => {
    const input = args[0] as ParserInput<DefType, Parent, Children, Fragments>
    const handles: HandlesMethods<DefType, Fragments> = args[1] ?? {}
    const parent = input.parent() as any as ParserMetadata<any, any, any>
    const validatedChildren: AnyParser[] = (input.children?.() as any) ?? []
    const inherits: HandlesMethods<DefType, Fragments> = {
        ...parent.meta.inherits,
        ...parent.meta.handles
    }
    const parse = (
        definition: DefType,
        context: ParseContext<DefType>
    ): ParseResult<DefType> => {
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
        const methods = transform(parserMethodNames, ([i, methodName]) => {
            if (methodName in handles) {
                return [methodName, handles[methodName]]
            }
            if (methodName in inherits) {
                return [methodName, inherits[methodName]]
            }
            return [methodName, matchingChild(...args)[methodName]]
        })
        return {
            matches: input.matches(...(args as [any, any])),
            definition,
            context,
            ...methods
        } as any
    }
    return Object.assign(parse, {
        meta: {
            type: input.type,
            inherits,
            handles
        }
    }) as any
}
