import type { TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveRoot } from "./nodes/resolve.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Type, TypeParser } from "./type.ts"
import { nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import { throwParseError } from "./utils/errors.ts"
import type {
    Dict,
    evaluate,
    mutable,
    nominal,
    stringKeyOf
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeParser = <parent extends ScopeRoot>(parent?: parent) =>
    lazyDynamicWrap((aliases: Dict) => {
        let $
        if (parent) {
            const merged = { ...parent.aliases }
            for (const name in aliases) {
                if (name in parent.aliases) {
                    throwParseError(buildDuplicateAliasMessage(name))
                }
                merged[name] = aliases[name]
            }
            $ = new ScopeRoot(merged)
            $.cache = parent.cache
        } else {
            $ = new ScopeRoot(aliases)
        }
        const types = {} as mutable<Scope>
        for (const name in $.aliases) {
            types[name] ??= $.type.dynamic($.aliases[name])
        }
        types.$ = $ as any
        return types
    }) as unknown as ScopeParser<ScopeRoot extends parent ? {} : parent>

export const composeTypeParser = <$ extends ScopeRoot>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveRoot(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    })

type ScopeParser<parent> = LazyDynamicWrap<
    InferredScopeParser<parent>,
    DynamicScopeParser<parent>
>

type InferredScopeParser<parent> = <aliases>(
    aliases: validateScope<aliases, parent>
) => Scope<inferScope<parent & aliases>>

type validateScope<aliases, parent> = {
    [name in keyof aliases]: name extends stringKeyOf<parent>
        ? buildDuplicateAliasMessage<name>
        : validateDefinition<aliases[name], inferScope<parent & aliases>>
}

type inferScope<aliases> = evaluate<{
    [k in keyof aliases]: inferDefinition<aliases[k], BootstrapScope<aliases>>
}>

type DynamicScopeParser<parent> = <aliases extends Dict>(
    aliases: aliases
) => Scope<Dict<stringKeyOf<parent> | stringKeyOf<aliases>>>

type ScopeCache = {
    nodes: { [def in string]: TypeNode }
    types: { [name in string]: Type }
}

export type Scope<root = Dict> = { [k in keyof root]: Type<root[k]> } & {
    $: ScopeRoot<root>
}

export class ScopeRoot<root = Dict> {
    cache: ScopeCache = {
        nodes: {},
        types: {}
    }

    type: TypeParser<root>
    extend: ScopeParser<root>

    constructor(public aliases: { readonly [k in keyof root]: unknown }) {
        this.type = composeTypeParser(this as any)
        this.extend = composeScopeParser(this as any) as ScopeParser<root>
    }

    get infer(): root {
        return chainableNoOpProxy
    }
}

export const scope: ScopeParser<{}> = composeScopeParser()

const rootScope = composeScopeParser()({})

export const type: TypeParser<{}> = composeTypeParser(rootScope.$)

export type BootstrapScope<$ = {}> = nominal<$, "bootstrap">

export const buildDuplicateAliasMessage = <name extends string>(
    name: name
): buildDuplicateAliasMessage<name> => `Alias '${name}' is already defined.`

type buildDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined.`
