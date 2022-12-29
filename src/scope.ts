import type { TypeNode } from "./nodes/node.ts"
import type { inferRoot, validateRoot } from "./parse/definition.ts"
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

export type ScopeConfig<parent extends Scope> = {
    parent?: parent
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeFn,
    DynamicScopeFn
>

let rootScope: Scope<{}, {}>

export type RootScope = typeof rootScope

export const getRootScope = () => {
    rootScope ??= scope({}) as any
    return rootScope!
}

type InferredScopeFn = <aliases, parent extends Scope = RootScope>(
    aliases: validateAliases<aliases, parent>,
    config?: ScopeConfig<parent>
) => Scope<inferAliases<aliases, parent>, aliases>

// TODO: imports/exports, extends
export type Scope<
    t extends Dict = Dict,
    def = Dict,
    types extends {
        [k in keyof t]: Type<t[k]>
    } = {
        [k in keyof t]: Type<t[k]>
    }
> = {
    infer: t
    def: def
    types: types
    cache: { [k in keyof t]: TypeNode }
    parent?: Scope
}

type DynamicScopeFn = <aliases extends Dict>(
    aliases: aliases
) => Scope<Dict<keyof aliases & string>, Dict<keyof aliases & string>>

export type aliasOf<s extends Scope> = keyof s["def"] & string

type validateAliases<aliases, parent extends Scope> = evaluate<{
    [name in keyof aliases]: validateRoot<
        aliases[name],
        parent & { def: aliases }
    >
}>

type inferAliases<aliases, parent extends Scope> = evaluate<{
    [name in keyof aliases]: inferRoot<aliases[name], parent & { def: aliases }>
}>
