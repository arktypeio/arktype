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
    mutable,
    stringKeyOf
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeConstructor = <parent extends Scope>(parent?: parent) =>
    lazyDynamicWrap((def: Dict) => {
        const bootstrap: mutable<Scope> = {
            $: {
                infer: chainableNoOpProxy,
                cache: {},
                aliases: def
            } satisfies Omit<ScopeMeta, "type" | "extend"> as any
        }
        bootstrap.$.type = composeTypeConstructor(bootstrap)
        bootstrap.$.extend = composeScopeConstructor(bootstrap)
        for (const name in def) {
            // TODO: Need to access scope here
            bootstrap[name] = type.dynamic(def[name])
        }
        return bootstrap
    }) as ScopeConstructor<Scope extends parent ? {} : parent>

// TODO: figure out how to avoid $ as an alias
export const composeTypeConstructor = <$ extends Scope>(
    $: $
): TypeConstructor<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const node = resolveIfIdentifier(parseDefinition(def, $), $)
        return nodeToType(node, $, traits)
    })

export const scope: ScopeConstructor<{}> = composeScopeConstructor()

const rootScope = composeScopeConstructor()({})

export const type: TypeConstructor<{}> = composeTypeConstructor(
    rootScope as Scope
)

type ScopeConstructor<parent> = LazyDynamicWrap<
    InferredScopeConstructor<parent>,
    DynamicScopeConstructor<parent>
>

type InferredScopeConstructor<parent> = <defs>(
    defs: validateScope<defs, parent>
) => Scope<parseScope<merge<parent, defs>>>

type DynamicScopeConstructor<parent> = <defs extends Dict>(
    aliases: defs
) => Scope<Aliases<stringKeyOf<parent & defs>>>

export type Aliases<name extends string = string> = { [k in name]: Type }

// TODO: imports/exports, extends
export type Scope<aliases = Aliases> = {
    $: ScopeMeta<aliases>
} & aliases

export type ScopeMeta<aliases = Aliases> = {
    type: InferredTypeConstructor<aliases>
    extend: ScopeConstructor<aliases>
    infer: {
        [k in keyof aliases]: aliases[k] extends { infer: infer data }
            ? data
            : never
    }
    cache: { [def in string]: TypeNode }
    aliases: Dict
}

type parseScope<defs> = evaluate<{
    [k in keyof defs]: isTopType<defs[k]> extends true
        ? Type
        : defs[k] extends Type
        ? defs[k]
        : defs[k] extends (() => infer r extends Type)
        ? r
        : toType<defs[k], defs, {}>
}>

type validateScope<defs, parent> = {
    // somehow using "any" as the thunk return type does not cause a circular
    // reference error (every other type does)
    [name in keyof defs]: defs[name] extends () => any
        ? defs[name]
        : validateDefinition<defs[name], merge<parent, defs>>
}

// TODO: test perf diff between Type/infer
export type inferResolution<def, $> = def extends () => {
    infer: infer data
}
    ? data
    : def extends { infer: infer data }
    ? data
    : inferDefinition<def, $>
