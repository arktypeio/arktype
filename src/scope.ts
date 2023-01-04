import type { TypeNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type {
    InferredTypeConstructor,
    parseType,
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

const composeScopeParser = <parent extends Resolver>(parent?: parent) =>
    lazyDynamicWrap((defs: Dict) => {
        const $: mutable<Resolver> = {
            infer: chainableNoOpProxy,
            cache: {},
            defs,
            aliases: {}
        } satisfies Omit<Resolver, "type" | "extend"> as any
        $.type = composeTypeParser($)
        $.extend = composeScopeParser($)
        for (const name in defs) {
            // TODO: Need to access scope here
            $.aliases[name] = type.dynamic(defs[name])
        }
        return Object.assign($.aliases, { $ })
    }) as ScopeConstructor<Scope extends parent ? {} : parent>

export const composeTypeParser = <$ extends Resolver>(
    $: $
): TypeConstructor<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const node = resolveIfIdentifier(parseDefinition(def, $), $)
        return nodeToType(node, $, traits)
    })

export const scope: ScopeConstructor<{}> = composeScopeParser()

const rootScope = composeScopeParser()({})

export const type: TypeConstructor<{}> = composeTypeParser(rootScope.$)

type ScopeConstructor<parent> = LazyDynamicWrap<
    InferredScopeConstructor<parent>,
    DynamicScopeConstructor<parent>
>

type InferredScopeConstructor<parent> = <defs>(
    defs: validateScope<defs, parent>
) => Scope<parseScope<merge<parent, defs>>>

type DynamicScopeConstructor<parent> = <defs extends Dict>(
    defs: defs
) => Scope<Aliases<stringKeyOf<parent & defs>>>

export type Aliases<name extends string = string> = { [k in name]: Type }

export type Scope<aliases = Aliases> = {
    $: Resolver<aliases>
} & aliases

export type Resolver<aliases = Aliases> = {
    type: InferredTypeConstructor<aliases>
    extend: ScopeConstructor<aliases>
    infer: {
        [k in keyof aliases]: aliases[k] extends { infer: infer data }
            ? data
            : never
    }
    cache: { [def in string]: TypeNode }
    aliases: aliases
    defs: { [k in keyof aliases]: unknown }
}

type parseScope<defs> = evaluate<{
    [k in keyof defs]: isTopType<defs[k]> extends true
        ? Type
        : defs[k] extends Type
        ? defs[k]
        : defs[k] extends (() => infer r extends Type)
        ? r
        : parseType<defs[k], defs, {}>
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
