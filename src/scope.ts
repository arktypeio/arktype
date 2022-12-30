import type { TypeNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type {
    InferredTypeConstructor,
    toType,
    Type,
    TypeConstructor
} from "./type.ts"
import { nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    Dict,
    evaluate,
    isTopType,
    merge,
    mutable
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeConstructor = <parent extends Scope = RootScope>(
    parent?: parent
) =>
    lazyDynamicWrap((def: Dict) => {
        const result: Scope = {
            // TODO: Finalize this behavior, align with types
            aliases: parent ? { ...parent.aliases, ...def } : def,
            infer: chainableNoOpProxy,
            cache: {},
            types: {},
            type: {} as any,
            extend: {} as any
        }
        result.type = composeTypeConstructor(result)
        result.extend = composeScopeConstructor(result)
        for (const name in def) {
            // TODO: Fix typeConfig
            ;(result.types as mutable<Scope["types"]>)[name] = type.dynamic(
                def[name]
            )
        }
        return result
    }) as ScopeConstructor<parent["aliases"]>

export const composeTypeConstructor = <scope extends Scope>(
    scope: scope
): TypeConstructor<scope["aliases"]> =>
    lazyDynamicWrap((def, traits = {}) => {
        const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
        return nodeToType(node, scope, traits)
    })

let rootScope: RootScope

export type RootScope = Scope<{}>

export const getRootScope = (): RootScope => {
    rootScope ??= composeScopeConstructor()({})
    return rootScope!
}

export const type: TypeConstructor<{}> = composeTypeConstructor(getRootScope())

export const scope: ScopeConstructor<{}> = composeScopeConstructor(
    getRootScope()
)

type ScopeConstructor<parentAliases> = LazyDynamicWrap<
    InferredScopeConstructor<parentAliases>,
    DynamicScopeConstructor<parentAliases>
>

type InferredScopeConstructor<parentAliases> = <aliases>(
    aliases: validateAliases<aliases, parentAliases>
) => Scope<merge<parentAliases, aliases>>

type DynamicScopeConstructor<parentAliases> = <aliases extends Dict>(
    aliases: aliases
) => Scope<{ [k in keyof aliases | keyof parentAliases]: "unknown" }>

// TODO: imports/exports, extends
export type Scope<aliases = Dict> = {
    aliases: aliases
    infer: inferAliases<aliases>
    types: toTypes<aliases>
    cache: toCache<aliases>
    type: InferredTypeConstructor<aliases>
    extend: ScopeConstructor<aliases>
}

type toTypes<aliases> = {
    [k in keyof aliases]: isTopType<aliases[k]> extends true
        ? Type
        : toType<aliases[k], aliases, {}>
}

type toCache<aliases> = { [k in keyof aliases]: TypeNode }

type validateAliases<aliases, parentAliases> = {
    [name in keyof aliases]: validateDefinition<
        aliases[name],
        merge<parentAliases, aliases>
    >
}

type inferAliases<aliases> = evaluate<{
    [name in keyof aliases]: inferDefinition<aliases[name], aliases>
}>
