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
import type { Domain, inferSubdomain } from "./utils/domains.ts"
import { throwParseError } from "./utils/errors.ts"
import type {
    Dict,
    evaluate,
    extend,
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
            $.cache = {
                nodes: { ...parent.cache.nodes },
                types: { ...parent.cache.types }
            }
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
    Function: [
        "node",
        { object: { subdomain: "Function" } }
    ] as inferred<Function>
})

const regexDefinition = (source: string) =>
    ["node", { string: { regex: source } }] as const

export const defaultScope = tsKeywords.$.extend({
    email: regexDefinition("^(.+)@(.+)\\.(.+)$"),
    alphanumeric: regexDefinition("^[dA-Za-z]+$"),
    alpha: regexDefinition("^[A-Za-z]+$"),
    lowercase: regexDefinition("^[a-z]*$"),
    uppercase: regexDefinition("^[A-Z]*$"),
    integer: ["node", { number: { divisor: 1 } }]
})

// This is just copied from the inference of defaultScope. Creating an explicit
// type like this makes validation for the default type and scope functions feel
// significantly more responsive.
type PrecompiledDefaults = {
    email: string
    alphanumeric: string
    alpha: string
    lowercase: string
    uppercase: string
    integer: number
    any: any
    bigint: bigint
    boolean: boolean
    false: false
    never: never
    null: null
    number: number
    object: object
    string: string
    symbol: symbol
    true: true
    unknown: unknown
    void: void
    undefined: undefined
    Function: Function
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ValidateDefaultScope = extend<
    PrecompiledDefaults,
    // if PrecompiledDefaults gets out of sync with defaultScope, there will be a type error here
    typeof defaultScope["$"]["infer"]
>

export const scope: ScopeParser<PrecompiledDefaults> = composeScopeParser(
    defaultScope.$
)

export const type: TypeParser<PrecompiledDefaults> = composeTypeParser(
    defaultScope.$
)

export type BootstrapScope<$ = {}> = nominal<$, "bootstrap">

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`
