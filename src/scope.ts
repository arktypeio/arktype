import type { TypeNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { parseType, Type, TypeParser } from "./type.ts"
import { isType, nodeToType } from "./type.ts"
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

// TODO: Integrate parent
const composeScopeParser = <parent extends Scope>(parent?: parent) =>
    lazyDynamicWrap((aliases: Dict) => {
        const $: mutable<Scope> = {
            infer: chainableNoOpProxy,
            cache: {
                nodes: {},
                types: {}
            },
            aliases,
            compile: () => compileScope($)
        } satisfies Omit<Scope, "type" | "extend"> as any
        $.type = composeTypeParser($)
        $.extend = composeScopeParser($)
        return $
    }) as ScopeParser<Scope extends parent ? {} : parent>

const compileScope = <aliases>($: Scope<aliases>) => {
    const types = {} as aliases
    for (const k in $.aliases) {
        const def = $.aliases[k]
        types[k] =
            typeof def === "function"
                ? isType(def)
                    ? def
                    : def()
                : nodeToType(
                      resolveIfIdentifier(parseDefinition(def, $), $),
                      $,
                      {}
                  )
    }
    return types
}

export const composeTypeParser = <$ extends Scope>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const node = resolveIfIdentifier(parseDefinition(def, $), $)
        return nodeToType(node, $, traits)
    })

type ScopeParser<parent> = LazyDynamicWrap<
    InferredScopeParser<parent>,
    DynamicScopeParser<parent>
>

type InferredScopeParser<parent> = <defs>(
    defs: validateScope<defs, parent>
) => Scope<parseScope<merge<parent, defs>>>

type DynamicScopeParser<parent> = <defs extends Dict>(
    defs: defs
) => Scope<Types<stringKeyOf<parent & defs>>>

export type Types<name extends string = string> = { [k in name]: Type }

export type Scope<types = Types> = {
    type: TypeParser<types>
    extend: ScopeParser<types>
    compile: () => types
    infer: inferScope<types>
    cache: {
        nodes: { [def in string]: TypeNode }
        types: types
    }
    aliases: { readonly [k in keyof types]: unknown }
}

type parseScope<aliases> = evaluate<{
    [k in keyof aliases]: isTopType<aliases[k]> extends true
        ? Type
        : aliases[k] extends Type
        ? aliases[k]
        : aliases[k] extends (() => infer r extends Type)
        ? r
        : parseType<aliases[k], aliases, {}>
}>

type validateScope<aliases, parent> = {
    // somehow using "any" as the thunk return type does not cause a circular
    // reference error (every other type does)
    [name in keyof aliases]: aliases[name] extends () => any
        ? aliases[name]
        : validateDefinition<aliases[name], merge<parent, aliases>>
}

type inferScope<types> = {
    [k in keyof types]: types[k] extends { infer: infer data } ? data : never
}

// TODO: test perf diff between Type/infer
export type inferResolution<resolution, $> = resolution extends () => {
    infer: infer data
}
    ? data
    : resolution extends { infer: infer data }
    ? data
    : inferDefinition<resolution, $>

export const scope: ScopeParser<{}> = composeScopeParser()

const rootScope = composeScopeParser()({})

export const type: TypeParser<{}> = composeTypeParser(rootScope)
