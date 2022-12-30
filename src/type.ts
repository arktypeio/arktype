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
import type { aliasOf, RootScope, Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    defer,
    evaluate,
    isTopType,
    nominal,
    xor
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    return nodeToType(node, scope, config)
}

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

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = {
    <def>(def: validateDefinition<def, RootScope>): createType<
        def,
        RootScope,
        {}
    >

    <
        def,
        sources extends Sources<inferDefinition<def, scope>, scope>,
        targets extends Targets<inferDefinition<def, scope>, scope>,
        scope extends Scope = RootScope
    >(
        def: validateDefinition<def, scope>,
        opts: {
            scope?: scope
            from?: sources
            to?: targets
        }
    ): createType<
        def,
        scope,
        compileMorphs<inferDefinition<def, scope>, scope, sources, targets>
    >
}

type createType<
    def,
    scope extends Scope,
    morphs extends Traits,
    data = inferDefinition<def, scope>
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, scope>
    ? {} extends morphs
        ? Type<data>
        : Morphable<data, evaluate<morphs>>
    : never

export type Traits<data = unknown, scope extends Scope = Scope> = {
    from?: Sources<data, scope>
    to?: Targets<data, scope>
}

export type Morphs<data = unknown, scope extends Scope = Scope> = {
    from?: Sources<data, scope>
    to?: (name: string, ...args: any[]) => unknown
}

export type Sources<data, scope extends Scope> = {
    [name in Identifier<aliasOf<scope>>]?: (
        source: inferDefinition<name, scope>,
        ...args: never[]
    ) => data
}

export type Targets<data, scope extends Scope> = {
    [name in Identifier<aliasOf<scope>>]?: (
        data: data,
        ...args: never[]
    ) => inferDefinition<name, scope>
}

type compileMorphs<
    data,
    scope extends Scope,
    sources extends Sources<data, scope>,
    targets extends Targets<data, scope>
> = (Sources<data, scope> extends sources
    ? {}
    : {
          from: sources
      }) &
    (Targets<data, scope> extends targets
        ? {}
        : {
              [k in keyof targets &
                  string as `to${Capitalize<k>}`]: targets[k] extends (
                  data: data,
                  ...args: infer args
              ) => infer returns
                  ? (...args: args) => returns
                  : never
          })

type DynamicTypeOptions = { scope?: Scope } & Traits

type DynamicTypeFn = (def: unknown, opts?: DynamicTypeOptions) => Morphable

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<data, targets> = targets &
    xor<{ data: data }, { problems: Problems }>

export type Checker<data, targets> = (
    data: unknown
) => CheckResult<data, targets>

export type TypeMetadata<data = unknown> = {
    infer: data
    root: TypeNode
    flat: TraversalNode
}

export type Type<data = unknown> = defer<Checker<data, {}> & TypeMetadata<data>>

export type Morphable<data = unknown, morphs extends Morphs = {}> = defer<
    Checker<data, morphs> & TypeMetadata<data>
>
