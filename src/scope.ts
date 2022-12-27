import type { TypeNode } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import type { Type } from "./type.ts"
import { type } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, evaluate } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const rawScope = (def: Dict, parent?: Scope) => {
    const result: Scope = {
        def,
        infer: chainableNoOpProxy,
        // TODO: intersection cache
        cache: {},
        types: {}
    }
    if (parent) {
        result.parent = parent
    }
    const typeConfig = { scope: result }
    for (const name in def) {
        // TODO: Fix typeConfig
        result.types[name] = type.dynamic(def[name], typeConfig as any)
    }
    return result
}

export type ScopeConfig<inferred extends Dict> = {
    scope?: Scope<inferred>
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeFn,
    DynamicScopeFn
>

let globalScope: Scope<{}, {}> | undefined

export type GlobalScope = typeof globalScope & {}

export const getGlobalScope = () => {
    globalScope ??= scope({}) as any
    return globalScope!
}

type InferredScopeFn = <aliases, inferredParent extends Dict = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: ScopeConfig<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

// TODO: imports/exports, extends
export type Scope<t extends Dict = Dict, def = Dict> = {
    infer: t
    def: def
    types: {
        [k in keyof t]: Type<t[k]>
    }
    cache: { [k in keyof t]: TypeNode }
    parent?: Scope
}

type DynamicScopeFn = <aliases extends Dict>(
    aliases: aliases
) => Scope<{ [k in keyof aliases]: unknown }>

export type aliasOf<s extends Scope> = keyof s["def"] & string

type validateAliases<aliases, inferredContext extends Dict> = evaluate<{
    [name in keyof aliases]: validateDefinition<
        aliases[name],
        Scope<inferredContext, aliases>
    >
}>

type inferAliases<aliases, inferredContext extends Dict> = evaluate<{
    [name in keyof aliases]: inferDefinition<
        aliases[name],
        Scope<inferredContext, aliases>
    >
}>

type inferScopeContext<aliases, inferredParent extends Dict> = inferAliases<
    aliases,
    inferredParent
> &
    inferredParent
