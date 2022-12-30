import type {
    Identifier,
    TraversalNode,
    TypeNode,
    TypeSet
} from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    defer,
    Dict,
    evaluate,
    isTopType,
    parametersOf,
    returnOf,
    tailOf,
    xor
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const composeType = <scope extends Scope>(
    scope: scope
): TypeConstructor<scope> =>
    lazyDynamicWrap((def, traits = {}) => {
        const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
        return nodeToType(node, scope, traits)
    })

export const nodeToType = (root: TypeSet, scope: Scope, config: Traits) => {
    const traversal = compileNode(root, scope)
    return Object.assign(
        (data: unknown) => {
            const result = check(data, traversal, scope)
            return result
                ? { data }
                : { problems: new Problems({ path: "", reason: "invalid" }) }
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat: traversal
        }
    ) as any
}

export const type = composeType(getRootScope())

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
                      [name in keyof traits["to"] & string]: (
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

export type TypeConstructor<scope extends Scope> = LazyDynamicWrap<
    InferredTypeConstructor<scope>,
    DynamicTypeFn
>

export type Result<data> = xor<{ data: data }, { problems: Problems }>

export type Chainable<data, outMorph> = outMorph & Result<data>

export type InferResult<
    name extends Identifier<aliases>,
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
