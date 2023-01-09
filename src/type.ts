import type { Identifier, TraversalNode, TypeRoot } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import type { Scope } from "./scope.ts"
import type { CheckConfig } from "./traverse/check.ts"
import { rootCheck } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    defer,
    Dict,
    evaluate,
    isTopType,
    merge,
    parametersOf,
    returnOf,
    stringKeyOf,
    xor
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const nodeToType = (
    root: TypeRoot,
    flat: TraversalNode,
    $: Scope,
    config: Traits
): Type => {
    return Object.assign(
        (data: unknown) => {
            return rootCheck(data, flat, $, config)
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat
        }
    ) as any
}

export const isType = (value: {}): value is Type =>
    (value as Type).infer === chainableNoOpProxy

export type InferredTypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $, {}>

    <def, traits extends Traits<inferDefinition<def, $>, $>>(
        def: validateDefinition<def, $>,
        traits: traits
    ): parseType<def, $, morphsFrom<traits>>
}

export type parseType<
    def,
    $,
    morphs extends Morphs
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, $>
    ? {} extends morphs
        ? Type<inferDefinition<def, $>>
        : Morphable<inferDefinition<def, $>, morphs>
    : never

export type Traits<data = unknown, $ = Dict> = Morphs<data, $> & CheckConfig

export type Morphs<data = unknown, $ = Dict> = {
    in?: Sources<data, $>
    out?: Targets<data, $>
}

export type Sources<data, $> = {
    [name in Identifier<$>]?: (source: inferDefinition<name, $>) => data
} & { [name in string]: (...args: never[]) => data }

export type Targets<data, $> = {
    [name in Identifier<$>]?: (data: data) => inferDefinition<name, $>
} & {
    [name in string]: (data: data) => unknown
}

export type morphsFrom<traits extends Traits> = evaluate<
    (traits["in"] extends {} ? { from: traits["in"] } : {}) &
        (traits["out"] extends {}
            ? {
                  out: {
                      [name in stringKeyOf<traits["out"]>]: returnOf<
                          traits["out"][name]
                      >
                  }
              }
            : {})
>

type DynamicTypeFn = (def: unknown, traits?: Traits) => Morphable

export type TypeParser<$> = LazyDynamicWrap<
    InferredTypeParser<$>,
    DynamicTypeFn
>

export type Result<output> = xor<output, { problems: Problems }>

export type Checker<output> = (data: unknown) => Result<output>

// TODO: Rename
export type TypeMetadata<data = unknown> = {
    infer: data
    root: TypeRoot
    flat: TraversalNode
}

export type Type<data = unknown> = defer<
    Checker<{ data: data }> & TypeMetadata<data>
>

export type Morphable<data = unknown, morphs extends Morphs = Morphs> = defer<
    Checker<merge<{ data: data }, morphs["out"]>> & TypeMetadata<data>
>
