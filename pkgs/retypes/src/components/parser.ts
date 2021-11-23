import {
    Evaluate,
    Func,
    KeyValuate,
    memoize,
    transform,
    TreeOf,
    ValueOf,
    Exact,
    stringify
} from "@re-do/utils"
import { typeDefProxy } from "../common.js"
import { typeOf } from "../typeOf.js"
import type {
    ExtractableDefinition,
    Root,
    UnvalidatedTypeSet
} from "./common.js"
import {
    stringifyErrors,
    ValidationErrors,
    unknownTypeError
} from "./errors.js"
import { Recursible } from "./recursible/index.js"

export type MatchesArgs<DefType> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
}

export type ParseContext<DefType> = {
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
    shallowSeen: string[]
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

export type ParserInput<
    DefType,
    Parent,
    Children extends DefType[],
    Components
> = {
    type: DefType
    parent: () => { meta: Parent }
    matches: DefinitionMatcher<Parent>
    components?: (...args: ParseArgs<DefType>) => Components
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

export type HandlesContext<DefType, Components> = [
    args: {
        def: DefType
        ctx: ParseContext<DefType>
    } & (unknown extends Components ? {} : { components: Components })
]

export type HandlesMethods<DefType, Components> = {
    allows?: (
        ...args: [
            ...args: HandlesContext<DefType, Components>,
            valueType: ExtractableDefinition,
            options: AllowsOptions
        ]
    ) => ValidationErrors
    references?: (
        ...args: [
            ...args: HandlesContext<DefType, Components>,
            options: ReferencesOptions
        ]
    ) => DefType extends Recursible.Definition<DefType>
        ? TreeOf<string[], true>
        : string[]
    generate?: (
        ...args: [
            ...args: HandlesContext<DefType, Components>,
            options: GenerateOptions
        ]
    ) => any
}

export type UnhandledMethods<DefType, Parent, Components> = Omit<
    HandlesMethods<DefType, Components>,
    keyof GetHandledMethods<Parent>
>

export type ParseFunction<DefType> = (
    ...args: ParseArgs<DefType>
) => ParsedType<DefType>

export type ParsedType<DefType> = {
    definition: DefType
    context: ParseContext<DefType>
} & CoreMethods<DefType> &
    InferredMethods

export type CoreMethods<DefType> = {
    [MethodName in CoreMethodName]-?: TransformInputMethod<
        NonNullable<HandlesMethods<DefType, any>[MethodName]>
    >
}

export type InferredMethods = {
    assert: (value: unknown, options?: AllowsOptions) => void
    check: (value: unknown, options?: AllowsOptions) => string
}

export type TransformInputMethod<
    Method extends ValueOf<HandlesMethods<any, any>>
> = Method extends (
    ...args: [infer ParseResult, ...infer Rest, infer Opts]
) => infer Return
    ? (...args: [...rest: Rest, opts?: Opts]) => Return
    : Method

export type GetHandledMethods<Parent> = (KeyValuate<
    Parent,
    "inherits"
> extends () => infer Return
    ? Return
    : {}) &
    KeyValuate<Parent, "handles">

export type ParserMetadata<
    DefType,
    Parent,
    Handles extends HandlesMethods<DefType, any>
> = Evaluate<{
    meta: {
        type: DefType
        inherits: () => GetHandledMethods<Parent>
        handles: unknown extends Handles ? {} : Handles
        matches: DefinitionMatcher<DefType>
    }
}>

export type Parser<DefType, Parent, Handles> = Evaluate<
    ParserMetadata<DefType, Parent, Handles> & ParseFunction<DefType>
>

export type CoreMethodName = keyof HandlesMethods<any, any>

const coreMethodNames = ["allows", "references", "generate"] as CoreMethodName[]

// Re:Root, reroot its root by rerouting to reroot
export const reroot = {
    meta: {
        type: {} as Root.Definition,
        inherits: () => {},
        handles: {}
    }
}

type AnyParser = Parser<any, any, any>

export const createParser = <
    Input,
    Handles,
    DefType,
    Parent,
    Components,
    Children extends DefType[] = []
>(
    ...args: [
        Exact<Input, ParserInput<DefType, Parent, Children, Components>>,
        ...HandlesArg<
            Children,
            Exact<Handles, UnhandledMethods<DefType, Parent, Components>>
        >
    ]
): Parser<DefType, Parent, Handles> => {
    const input = args[0] as ParserInput<DefType, Parent, Children, Components>
    const handles = (args[1] as HandlesMethods<DefType, Components>) ?? {}
    // Need to wait until parse is called to access parent to avoid it being undefined
    // due to circular import
    const getInherited = () => {
        const parent = input.parent() as any as ParserMetadata<any, any, any>
        return {
            ...parent.meta.inherits(),
            ...parent.meta.handles
        } as HandlesMethods<DefType, Components>
    }
    const getChildren = (): AnyParser[] => (input.children?.() as any) ?? []
    const cachedComponents: Record<string, any> = {}
    const getComponents = ([def, ctx]: ParseArgs<DefType>) => {
        const memoKey = stringify({
            def,
            typeSet: ctx.typeSet,
            shallowSeen: ctx.shallowSeen
        })
        if (!cachedComponents[memoKey]) {
            cachedComponents[memoKey] = input.components?.(def, ctx) ?? {}
        }
        return cachedComponents[memoKey]
    }
    const parse = (
        def: DefType,
        ctx: ParseContext<DefType>
    ): ParsedType<DefType> => {
        const args: ParseArgs<DefType> = [def, ctx]
        const inherits = getInherited()
        const children = getChildren()
        const components = getComponents(args)
        let matchingChild: AnyParser
        if (children.length) {
            const match = children.find((child) => child.meta.matches(...args))
            if (!match) {
                if (input.fallback) {
                    return input.fallback(...args)
                }
                throw new Error(unknownTypeError(def, ctx.path))
            }
            matchingChild = match
        }
        const transformCoreMethod =
            (name: CoreMethodName, inputMethod: Func) =>
            (...providedArgs: Parameters<ValueOf<CoreMethods<DefType>>>) => {
                const methodContext = {
                    def,
                    ctx,
                    components
                }
                if (name === "allows") {
                    return inputMethod(
                        methodContext,
                        providedArgs[0],
                        providedArgs[1] ?? {}
                    )
                }
                return inputMethod(methodContext, providedArgs[0] ?? {})
            }

        const delegateCoreMethod = (methodName: CoreMethodName) => {
            if (!children.length) {
                throw new Error(
                    `${methodName} was never implemented on the current component's branch.`
                )
            }
            return matchingChild(...args)[methodName]
        }
        const coreMethods: CoreMethods<DefType> = transform(
            coreMethodNames,
            ([i, methodName]) => [
                methodName,
                handles[methodName]
                    ? transformCoreMethod(methodName, handles[methodName]!)
                    : inherits[methodName]
                    ? transformCoreMethod(methodName, inherits[methodName]!)
                    : delegateCoreMethod(methodName)
            ]
        )
        const check: InferredMethods["check"] = (value, options) =>
            stringifyErrors(coreMethods.allows(typeOf(value), options))
        const inferredMethods: InferredMethods = {
            check,
            assert: (value, options) => {
                const errorMessage = check(value, options)
                if (errorMessage) {
                    throw new Error(errorMessage)
                }
            }
        }
        return {
            definition: def,
            context: ctx,
            type: typeDefProxy,
            ...coreMethods,
            ...inferredMethods
        } as any
    }
    return Object.assign(parse, {
        meta: {
            type: input.type,
            inherits: getInherited,
            handles,
            matches: input.matches
        }
    }) as any
}
