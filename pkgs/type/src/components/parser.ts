import {
    Evaluate,
    Func,
    KeyValuate,
    transform,
    TreeOf,
    ValueOf,
    Exact,
    toString
} from "@re-do/utils"
import { ExtractableDefinition } from "./internal.js"
import { Root } from "./root.js"
import { TypeSet } from "./typeSet"
import { ValidationErrors, unknownTypeError } from "./errors.js"
import { Recursible } from "./recursible/index.js"

export type MatchesArgs<DefType> = {
    definition: DefType
    typeSet: TypeSet.Definition
}

export type ParseContext = {
    typeSet: TypeSet.Definition
    path: string[]
    seen: string[]
    shallowSeen: string[]
}

export type ParseArgs<DefType> = [definition: DefType, context: ParseContext]

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
        ctx: ParseContext
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

export type ParseFunction<DefType, Components> = (
    ...args: ParseArgs<DefType>
) => ParseResult<DefType>

export type ParseResult<DefType> = {
    def: DefType
    ctx: ParseContext
} & CoreMethods<DefType>

export type CoreMethods<DefType> = {
    [MethodName in CoreMethodName]-?: TransformInputMethod<
        NonNullable<HandlesMethods<DefType, any>[MethodName]>
    >
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

export type Parser<DefType, Parent, Handles, Components> = Evaluate<
    ParserMetadata<DefType, Parent, Handles> &
        ParseFunction<DefType, Components>
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

type AnyParser = Parser<any, any, any, any>

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
): Parser<DefType, Parent, Handles, Components> => {
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
    const getComponents = (def: DefType, ctx: ParseContext) => {
        const memoKey = toString({
            def,
            typeSet: ctx.typeSet,
            shallowSeen: ctx.shallowSeen,
            seen: ctx.seen,
            path: ctx.path
        })
        if (!cachedComponents[memoKey]) {
            cachedComponents[memoKey] =
                input.components?.(def, ctx) ?? undefined
        }
        return cachedComponents[memoKey]
    }
    const transformCoreMethod =
        (
            name: CoreMethodName,
            inputMethod: Func,
            def: DefType,
            ctx: ParseContext,
            components: Components
        ) =>
        (...providedArgs: Parameters<ValueOf<CoreMethods<DefType>>>) => {
            if (name === "allows") {
                return inputMethod(
                    {
                        def,
                        ctx,
                        components
                    },
                    providedArgs[0],
                    providedArgs[1] ?? {}
                )
            }
            return inputMethod(
                {
                    def,
                    ctx,
                    components
                },
                providedArgs[0] ?? {}
            )
        }

    const delegateCoreMethod = (
        methodName: CoreMethodName,
        def: DefType,
        ctx: ParseContext
    ) => {
        const children = getChildren()
        if (!children.length) {
            throw new Error(
                `${methodName} was never implemented on the current component's branch.`
            )
        }
        const match = children.find((child) => child.meta.matches(def, ctx))
        if (!match) {
            if (input.fallback) {
                return input.fallback(def, ctx)
            }
            throw new Error(unknownTypeError(def, ctx.path))
        }
        return match(def, ctx)[methodName]
    }
    const getCoreMethods = (
        def: DefType,
        ctx: ParseContext,
        components: any
    ) => {
        return transform(coreMethodNames, ([i, methodName]) => [
            methodName,
            handles[methodName]
                ? transformCoreMethod(
                      methodName,
                      handles[methodName]!,
                      def,
                      ctx,
                      components
                  )
                : getInherited()[methodName]
                ? transformCoreMethod(
                      methodName,
                      getInherited()[methodName]!,
                      def,
                      ctx,
                      components
                  )
                : delegateCoreMethod(methodName, def, ctx)
        ]) as CoreMethods<DefType>
    }

    const parse = (def: DefType, ctx: ParseContext): ParseResult<DefType> => {
        const components = getComponents(def, ctx)
        return {
            def,
            ctx,
            ...getCoreMethods(def, ctx, components)
        }
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
