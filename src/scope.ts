import type { TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/resolve.ts"
import type {
    inferDefinition,
    inferred,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Type, TypeParser } from "./type.ts"
import { nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Domain } from "./utils/domains.ts"
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

const composeScopeParser = <parent>(parent?: ScopeRoot<parent>) =>
    lazyDynamicWrap((aliases: Dict) => {
        let $
        if (parent) {
            const merged: Record<string, unknown> = { ...parent.aliases }
            for (const name in aliases) {
                if (name in parent.aliases) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                merged[name] = aliases[name]
            }
            $ = new ScopeRoot(merged)
            // we can copy the parent cache because we don't allow overriding
            $.cache = { ...parent.cache }
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

export const composeTypeParser = <$ extends ScopeRoot<any>>(
    $: $
): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveIfIdentifier(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    })

type ScopeParser<parent> = LazyDynamicWrap<
    InferredScopeParser<parent>,
    DynamicScopeParser<parent>
>

type InferredScopeParser<parent> = <aliases>(
    aliases: validateScope<aliases, parent>
) => Scope<inferScope<aliases, parent>>

type validateScope<aliases, parent> = {
    [name in keyof aliases]: name extends stringKeyOf<parent>
        ? writeDuplicateAliasMessage<name>
        : validateDefinition<aliases[name], inferScope<aliases, parent>>
}

type inferScope<aliases, parent> = evaluate<
    {
        [k in keyof aliases]: inferDefinition<
            aliases[k],
            { [k in keyof aliases]: BootstrapScope<aliases[k]> } & parent
        >
    } & parent
>

type DynamicScopeParser<parent> = <aliases extends Dict>(
    aliases: aliases
) => Scope<Dict<stringKeyOf<parent> | stringKeyOf<aliases>>>

type ScopeCache = {
    nodes: { [def in string]: TypeNode }
    types: { [name in string]: Type }
}

// TODO: change names to Space/Scope?
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

const always: Record<Domain, true> = {
    bigint: true,
    boolean: true,
    null: true,
    number: true,
    object: true,
    string: true,
    symbol: true,
    undefined: true
}

export const tsKeywords = composeScopeParser()({
    any: ["node", always] as inferred<any>,
    bigint: ["node", { bigint: true }],
    boolean: ["node", { boolean: true }],
    false: ["node", { boolean: { value: false } }],
    never: ["node", {}],
    null: ["node", { null: true }],
    number: ["node", { number: true }],
    object: ["node", { object: true }],
    string: ["node", { string: true }],
    symbol: ["node", { symbol: true }],
    true: ["node", { boolean: { value: true } }],
    unknown: ["node", always] as inferred<unknown>,
    void: ["node", { undefined: true }] as inferred<void>,
    undefined: ["node", { undefined: true }],
    // TODO: Add remaining JS object types
    Function: { object: { subdomain: "Function" } }
})

export const defaultScope = tsKeywords.$.extend({
    email: /^(.+)@(.+)\\.(.+)$/,
    alphanumeric: /^[dA-Za-z]+$/,
    alpha: /^[A-Za-z]+$/,
    lowercase: /^[a-z]*$/,
    uppercase: /^[A-Z]*$/,
    integer: "number%1"
})

type DefaultScopeRoot = typeof defaultScope["$"]["infer"]

export const scope: ScopeParser<DefaultScopeRoot> = composeScopeParser(
    defaultScope.$
)

export const type: TypeParser<DefaultScopeRoot> = composeTypeParser(
    defaultScope.$
)

export type BootstrapScope<$ = {}> = nominal<$, "bootstrap">

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`
