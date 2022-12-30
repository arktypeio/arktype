import type { TypeNode } from "./nodes/node.ts"
import type {
    buildUninferableDefinitionMessage,
    inferDefinition,
    validateDefinition
} from "./parse/definition.ts"
import type { InferredTypeFn, Morphable, Traits } from "./type.ts"
import { type } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, evaluate, isTopType } from "./utils/generics.ts"
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
        [k in keyof t]: Morphable<t[k]>
    } = {
        [k in keyof t]: Morphable<t[k]>
    }
> = {
    infer: t
    def: def
    types: types
    cache: { [k in keyof t]: TypeNode }
    parent?: Scope
    type: InferredTypeFn<Scope<t, def, types>>
}

type DynamicScopeFn = <aliases extends Dict>(
    aliases: aliases
) => Scope<Dict<keyof aliases & string>, Dict<keyof aliases & string>>

export type aliasOf<scope extends Scope> = keyof scope["def"] & string

type validateAliases<aliases, parent extends Scope> = evaluate<{
    [name in keyof aliases]: validateTypeDefinition<
        aliases[name],
        parent & { def: aliases }
    >
}>

type validateTypeDefinition<
    def,
    scope extends Scope
> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<def>
    : def extends TraitsTuple
    ? validateTraitsTuple<def, scope>
    : validateDefinition<def, scope>

type inferAliases<aliases, parent extends Scope> = evaluate<{
    [name in keyof aliases]: inferTypeDefinition<
        aliases[name],
        parent & { def: aliases }
    >
}>

type inferTypeDefinition<def, scope extends Scope> = def extends TraitsTuple
    ? inferTraitsTuple<def, scope>
    : inferDefinition<def, scope>

export type TraitsTuple = [unknown, ":", unknown]

export type inferTraitsTuple<
    def extends TraitsTuple,
    scope extends Scope
> = inferDefinition<def[0], scope>

export type validateTraitsTuple<
    def extends TraitsTuple,
    scope extends Scope
> = [
    validateDefinition<def[0], scope>,
    ":",
    Traits<inferDefinition<def[0], scope>, scope>
]
