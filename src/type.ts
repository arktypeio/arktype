import type { Identifier, TraversalNode, TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { aliasOf, GlobalScope, Scope } from "./scope.ts"
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
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    const traversal = compileNode(node, scope)
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
        s extends Scope = GlobalScope,
        t = inferDefinition<def, s>,
        traits extends Traits<t, s> = Traits<t, s>
    >(
        def: validateDefinition<def, s>,
        traits: { scope?: s } & traits
    ): InferredTypeResult<def, s>
}

type InferredTypeResult<def, s extends Scope> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, s>
    ? Type<inferDefinition<def, s>>
    : never

// TODO: Allow extra args to morphs
export type Traits<t, s extends Scope> = {
    in?: {
        [name in Identifier<aliasOf<s>>]?: (data: inferDefinition<name, s>) => t
    }
    out?: {
        [name in Identifier<aliasOf<s>>]?: (data: t) => inferDefinition<name, s>
    }
}

type DynamicTypeFn = (
    def: unknown,
    traits?: { scope?: Scope } & Traits<unknown, Scope>
) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<t = unknown> = xor<{ data: t }, { problems: Problems }>

export type Checker<t = unknown> = (data: unknown) => CheckResult<t>

export type TypeMetadata<t = unknown> = {
    infer: t
    root: TypeNode
    flat: TraversalNode
}

export type Type<t = unknown> = Checker<t> & TypeMetadata<t>
