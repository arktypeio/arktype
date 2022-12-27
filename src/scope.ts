import { flatKeywords, keywords } from "./nodes/keywords.ts"
import type { TraversalNode, TypeNode, TypeSet } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import type {
    ResolvedPredicate,
    TraversalPredicate
} from "./nodes/predicate.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import { fullStringParse, maybeNaiveParse } from "./parse/string/string.ts"
import type { Type } from "./type.ts"
import { type } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Domain } from "./utils/domains.ts"
import { throwInternalError, throwParseError } from "./utils/errors.ts"
import { deepFreeze } from "./utils/freeze.ts"
import type { Dict, evaluate } from "./utils/generics.ts"
import { isKeyOf } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const rawScope = (def: Dict, parent?: Scope) => {
    const result: Scope = {
        def,
        infer: chainableNoOpProxy,
        types: {}
    }
    // TODO: intersection cache
    const cache: { [def: string]: TypeNode } = {}
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

let globalScope: Scope<{}> | undefined

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

export type Scope<t extends Dict = Dict, def = Dict> = {
    infer: t
    def: def
    types: {
        [k in keyof t]: Type<t[k]>
    }
}

type DynamicScopeFn = <aliases extends Dict>(
    aliases: aliases
) => Scope<{ [k in keyof aliases]: unknown }>

// TODO: imports/exports, extends
// TODO: What should we build into this? Parsing/lookups etc.

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

export const buildShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`
