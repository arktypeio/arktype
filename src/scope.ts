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
import type { Dict, isTopType, merge, mutable } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeConstructor = <parent extends Scope = RootScope>(
    parent?: parent
) =>
    lazyDynamicWrap((def: Dict) => {
        const types: Scope["types"] = {}
        for (const name in def) {
            // TODO: Fix typeConfig
            // TODO: could these already be defined?
            types[name] = type.dynamic(def[name])
        }
        const bootstrapScope = {
            types,
            meta: {
                infer: chainableNoOpProxy,
                cache: {},
                aliases: def
            }
        } satisfies Omit<Scope, "type" | "extend"> as Scope
        bootstrapScope.type = composeTypeConstructor(bootstrapScope)
        bootstrapScope.extend = composeScopeConstructor(bootstrapScope)
        return bootstrapScope
    }) as ScopeConstructor<parent["types"]>

export const composeTypeConstructor = <scope extends Scope>(
    scope: scope
): TypeConstructor<scope["types"]> =>
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

export const scope: ScopeConstructor<{}> = composeScopeConstructor()

type ScopeConstructor<parent> = LazyDynamicWrap<
    InferredScopeConstructor<parent>,
    DynamicScopeConstructor<parent>
>

type InferredScopeConstructor<parent> = <aliases>(
    aliases: validateAliases<aliases, parent>
) => Scope<toTypes<merge<parent, aliases>>>

type DynamicScopeConstructor<parent> = <aliases extends Dict>(
    aliases: aliases
) => Scope<{ [k in keyof aliases | keyof parent]: Type }>

// TODO: imports/exports, extends
export type Scope<types = { [k in string]: Type }> = {
    types: types
    type: InferredTypeConstructor<types>
    extend: ScopeConstructor<types>
    // TODO: finalize API after writing more tests
    // TODO: how to use word aliases?
    meta: {
        infer: {
            [k in keyof types]: types[k] extends { infer: infer data }
                ? data
                : never
        }
        cache: { [def in string]: TypeNode }
        aliases: Dict
    }
}

type toTypes<aliases> = {
    [k in keyof aliases]: isTopType<aliases[k]> extends true
        ? Type
        : aliases[k] extends Type
        ? aliases[k]
        : aliases[k] extends (() => infer r extends Type)
        ? r
        : toType<aliases[k], aliases, {}>
}

type validateAliases<aliases, parentAliases> = {
    // somehow using "any" as the thunk return type does not cause a circular
    // reference error (every other type does)
    [name in keyof aliases]: aliases[name] extends () => any
        ? aliases[name]
        : validateDefinition<aliases[name], merge<parentAliases, aliases>>
}

// TODO: test perf diff between Type/infer
export type inferResolution<def, $> = def extends () => {
    infer: infer data
}
    ? data
    : def extends { infer: infer data }
    ? data
    : inferDefinition<def, $>
