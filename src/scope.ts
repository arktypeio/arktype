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
    lazyDynamicWrap((defs: Dict) => {
        let aliases: Aliases | undefined
        const $: mutable<Scope> = {
            infer: chainableNoOpProxy,
            cache: {},
            defs,
            get aliases() {
                if (aliases === undefined) {
                    aliases = {}
                    for (const k in defs) {
                        const def = defs[k]
                        aliases[k] =
                            typeof def === "function"
                                ? isType(def)
                                    ? def
                                    : def()
                                : nodeToType(
                                      resolveIfIdentifier(
                                          parseDefinition(def, $),
                                          $
                                      ),
                                      $,
                                      {}
                                  )
                    }
                }
                return aliases
            },
            compile: () => {
                return $.aliases
            }
        } satisfies Omit<Scope, "type" | "extend"> as any
        $.type = composeTypeParser($)
        $.extend = composeScopeParser($)
        return $
    }) as ScopeParser<Scope extends parent ? {} : parent>

const resolveScope = ($: Scope): Scope => {
    for (const k in $.defs) {
        const def = $.defs[k]
        $.aliases[k] =
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
    return $
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
) => Scope<Aliases<stringKeyOf<parent & defs>>>

export type Aliases<name extends string = string> = { [k in name]: Type }

export type Scope<aliases = Aliases> = {
    type: TypeParser<aliases>
    extend: ScopeParser<aliases>
    infer: {
        [k in keyof aliases]: aliases[k] extends { infer: infer data }
            ? data
            : never
    }
    cache: { [def in string]: TypeNode }
    compile: () => aliases
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

export const scope: ScopeParser<{}> = composeScopeParser()

const rootScope = composeScopeParser()({})

export const type: TypeParser<{}> = composeTypeParser(rootScope)
