import type { Identifier, TraversalNode, TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type {
    inferDefinition,
    S,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { GlobalScope, Scope } from "./scope.ts"
import { getGlobalScope, scope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, isTopType, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getGlobalScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope.$), scope.$)
    const traversal = compileNode(node, scope.$)
    return Object.assign(
        (data: unknown) => {
            const result = check(data, traversal, scope.$)
            return result
                ? { data }
                : { problems: new Problems({ path: "", reason: "invalid" }) }
        },
        {
            config,
            infer: chainableNoOpProxy,
            root: node,
            flat: traversal
        }
    ) as any
}

// TODO: allow type to be used as a def
export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = {
    <def>(def: validateDefinition<def, GlobalScope>): InferredTypeResult<
        def,
        GlobalScope
    >
    <
        def,
        T extends Dict = {},
        // TODO: Change name of scope[t]
        s extends S = { T: T; aliases: {} }
    >(
        def: validateDefinition<def, s>,
        traits: { scope?: Scope<T> } & Traits<InferredTypeResult<def, s>, s>
    ): InferredTypeResult<def, s>
}

type("string|number[]>10")

type("string|a", { scope: scope({ a: "number" }) }).infer

type InferredTypeResult<def, s extends S> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, s>
    ? Type<inferDefinition<def, s>>
    : never

export type Traits<t, s extends S> = {
    in?: {
        [name in Identifier<s>]?: (data: inferDefinition<name, s>) => t
    }
    out?: {
        [name in Identifier<s>]?: (data: t) => inferDefinition<name, s>
    }
}

type DynamicTypeFn = (
    def: unknown,
    traits?: { scope?: Scope<Dict> } & Traits<unknown, S>
) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<T = unknown> = xor<{ data: T }, { problems: Problems }>

export type Checker<T = unknown> = (data: unknown) => CheckResult<T>

export type TypeMetadata<T = unknown> = {
    infer: T
    root: TypeNode
    flat: TraversalNode
}

export type Type<t = unknown> = Checker<t> & TypeMetadata<t>
