import type {
    Identifier,
    TraversalNode,
    TypeNode,
    TypeSet
} from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import type { Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { rootCheck } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    defer,
    Dict,
    evaluate,
    isTopType,
    parametersOf,
    returnOf,
    stringKeyOf,
    tailOf,
    xor
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const nodeToType = (
    root: TypeSet,
    scope: Scope,
    config: Traits
): Type => {
    const traversal = compileNode(root, scope)
    return Object.assign(
        (data: unknown) => {
            return rootCheck(data, traversal, scope)
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat: traversal
        }
    ) as any
}

export type InferredTypeConstructor<aliases> = {
    <def>(def: validateDefinition<def, aliases>): toType<def, aliases, {}>

    <def, traits extends Traits<inferDefinition<def, aliases>, aliases>>(
        def: validateDefinition<def, aliases>,
        traits: traits
    ): toType<def, aliases, morphsFrom<traits, aliases>>
}

export type toType<
    def,
    aliases,
    morphs extends Morphs
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, aliases>
    ? {} extends morphs
        ? Type<inferDefinition<def, aliases>>
        : Morphable<inferDefinition<def, aliases>, morphs>
    : never

export type Traits<data = unknown, aliases = Dict> = Morphs<data, aliases>

export type Morphs<data = unknown, aliases = Dict> = {
    from?: Sources<data, aliases>
    to?: Targets<data, aliases>
}

export type Sources<data, aliases> = {
    [name in Identifier<aliases>]?: (
        source: inferDefinition<name, aliases>,
        ...args: never[]
    ) => data
}

export type Targets<data, aliases> = {
    [name in Identifier<aliases>]?: (
        data: data,
        ...args: never[]
    ) => inferDefinition<name, aliases>
}

export type morphsFrom<traits extends Traits, aliases> = evaluate<
    (traits["from"] extends {} ? { from: traits["from"] } : {}) &
        (traits["to"] extends {}
            ? {
                  to: {
                      [name in stringKeyOf<traits["to"]>]: (
                          ...args: parametersOf<traits["to"][name]>
                      ) => InferResult<name, aliases>
                  }
              }
            : {})
>

type compileOutMorph<morphs extends Morphs> = morphs["to"] extends {}
    ? {
          to: <k extends keyof morphs["to"]>(
              name: k,
              ...args: tailOf<parametersOf<morphs["to"][k]>>
          ) => returnOf<morphs["to"][k]>
      }
    : {}

type DynamicTypeFn = (def: unknown, traits?: Traits) => Morphable

export type TypeConstructor<aliases> = LazyDynamicWrap<
    InferredTypeConstructor<aliases>,
    DynamicTypeFn
>

export type Result<data> = xor<{ data: data }, { problems: Problems }>

export type Chainable<data, outMorph> = outMorph & Result<data>

export type InferResult<
    name extends string,
    aliases
> = name extends keyof aliases
    ? // TODO: Fix
      Result<inferDefinition<name, aliases>> //ReturnType<aliases[name]>
    : Result<inferDefinition<name, aliases>>

export type Checker<data, outMorph> = (data: unknown) => outMorph & Result<data>

export type TypeMetadata<data = unknown> = {
    infer: data
    root: TypeNode
    flat: TraversalNode
}

export type Type<data = unknown> = defer<Checker<data, {}> & TypeMetadata<data>>

export type Morphable<data = unknown, morphs extends Morphs = Morphs> = defer<
    Checker<data, compileOutMorph<morphs>> & TypeMetadata<data>
>
