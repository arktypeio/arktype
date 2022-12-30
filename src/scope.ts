import type { TypeNode } from "./nodes/node.ts"
import type {
    buildUninferableDefinitionMessage,
    inferDefinition,
    validateDefinition
} from "./parse/definition.ts"
import type {
    InferredTypeConstructor,
    morphsFrom,
    toType,
    Traits,
    Type
} from "./type.ts"
import { composeType, type } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, evaluate, isTopType, mutable } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const rawScope = (def: Dict, parent?: Scope) => {
    const result: Scope = {
        aliases: def,
        infer: chainableNoOpProxy,
        cache: {},
        types: {},
        type: {} as any
    }
    result.type = composeType(result) as any
    if (parent) {
        result.parent = parent
    }
    for (const name in def) {
        // TODO: Fix typeConfig
        ;(result.types as mutable<Scope["types"]>)[name] = type.dynamic(
            def[name]
        )
    }
    return result
}

export type ScopeConfig<parent extends Scope> = {
    parent?: parent
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeConstructor,
    DynamicScopeConstructor
>

let rootScope: Scope<{}>

export type RootScope = typeof rootScope

export const getRootScope = () => {
    rootScope ??= scope({}) as any
    return rootScope!
}

type InferredScopeConstructor = <aliases, parent extends Scope = RootScope>(
    aliases: validateAliases<aliases, parent>,
    config?: ScopeConfig<parent>
) => Scope<aliases>

type toTypes<aliases> = {
    [k in keyof aliases]: aliases[k] extends TraitsTuple
        ? aliases[k][2] extends Traits
            ? toType<
                  aliases[k][0],
                  aliases,
                  morphsFrom<aliases[k][2], RootScope>
              >
            : // TODO: Add error
              never
        : toType<aliases[k], aliases, {}>
}

// TODO: imports/exports, extends
export type Scope<aliases = Dict> = {
    aliases: aliases
    // TODO: Fix parent
    infer: Dict extends aliases ? Dict : inferAliases<aliases, RootScope>
    types: Dict extends aliases ? Dict<string, Type> : toTypes<aliases>
    cache: { [k in keyof aliases]: TypeNode }
    parent?: Scope
    type: InferredTypeConstructor<aliases>
}

type DynamicScopeConstructor = <aliases extends Dict>(
    aliases: aliases
) => Scope<{ [k in keyof aliases]: "unknown" }>

type validateAliases<aliases, parent extends Scope> = evaluate<{
    [name in keyof aliases]: validateTypeDefinition<
        aliases[name],
        aliases & parent["aliases"]
    >
}>

type validateTypeDefinition<def, aliases> = isTopType<def> extends true
    ? buildUninferableDefinitionMessage<def>
    : def extends TraitsTuple
    ? validateTraitsTuple<def, aliases>
    : validateDefinition<def, aliases>

type inferAliases<aliases, parent extends Scope> = evaluate<{
    [name in keyof aliases]: inferTypeDefinition<
        aliases[name],
        aliases & parent["aliases"]
    >
}>

type inferTypeDefinition<def, aliases> = def extends TraitsTuple
    ? inferTraitsTuple<def, aliases>
    : inferDefinition<def, aliases>

export type TraitsTuple = [unknown, ":", unknown]

export type inferTraitsTuple<
    def extends TraitsTuple,
    aliases
> = inferDefinition<def[0], aliases>

export type validateTraitsTuple<def extends TraitsTuple, aliases> = [
    validateDefinition<def[0], aliases>,
    ":",
    Traits<inferDefinition<def[0], aliases>, aliases>
]
