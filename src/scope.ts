import type { TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveNode } from "./nodes/resolve.ts"
import type {
    inferDefinition,
    inferred,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Type, TypeParser } from "./type.ts"
import { isType, nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Domain } from "./utils/domains.ts"
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

const composeScopeParser = <opts extends ScopeOptions>(opts?: opts) =>
    lazyDynamicWrap(
        (aliases: Dict) => new Scope(aliases, opts ?? {})
    ) as unknown as ScopeParser<ScopeOptions extends opts ? {} : opts>

export const composeTypeParser = <$ extends Scope<any>>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveNode(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    })

type ScopeParser<parent> = LazyDynamicWrap<
    InferredScopeParser<parent>,
    DynamicScopeParser<parent>
>

// TODO: integrate scope imports/exports Maybe reintegrate thunks/compilation?
// Could still be useful for narrowed defs in scope, would make types cleaner
// for actually being able to assign scopes. test.
export type ScopeOptions = {
    imports?: Scope[]
    exports?: Scope[]
}

type InferredScopeParser<parent> = <aliases>(
    aliases: validateScope<aliases, parent>,
    opts?: ScopeOptions
) => Space<inferScope<aliases, parent>>

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
) => Space<Dict<stringKeyOf<parent> | stringKeyOf<aliases>>>

type ScopeCache = {
    nodes: { [def in string]?: TypeNode }
    types: { [name in string]?: Type }
}

export type Space<root = Dict> = { [k in keyof root]: Type<root[k]> }

export class Scope<root = Dict> {
    cache: ScopeCache = {
        nodes: {},
        types: {}
    }

    type: TypeParser<root>
    extend: ScopeParser<root>

    constructor(
        aliases: { readonly [k in keyof root]: unknown },
        public config: ScopeOptions
    ) {
        if (config.exports) {
            const parent = config.exports[0]
            const merged: Record<string, unknown> = {
                ...parent.aliases
            }
            for (const name in aliases) {
                if (name in parent.aliases) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                merged[name] = aliases[name]
            }
            $ = new Scope(merged)
        }
        this.type = composeTypeParser(this as any)
        this.extend = composeScopeParser(this as any) as ScopeParser<root>
    }

    get infer(): root {
        return chainableNoOpProxy
    }

    compile() {
        const types = {} as Space
        for (const name in this.aliases) {
            const def = this.aliases[name]
            types[name] ??=
                typeof def === "function"
                    ? isType(def)
                        ? def
                        : def()
                    : this.type.dynamic(this.aliases[name])
        }
        return types as Space<root>
    }

    oldCompile() {
        let $
        if (opts?.exports) {
            const merged: Record<string, unknown> = { ...parent.aliases }
            for (const name in aliases) {
                if (name in parent.aliases) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                merged[name] = aliases[name]
            }
            $ = new Scope(merged)
            // we can copy the parent cache because we don't allow overriding
            // TODO: do this in constructor
            $.cache = {
                nodes: { ...parent.cache.nodes },
                types: { ...parent.cache.types }
            }
        } else {
            $ = new Scope(aliases)
        }
        const types = {} as mutable<Space>
        for (const name in $.aliases) {
            types[name] ??= $.type.dynamic($.aliases[name])
        }
        types.$ = $ as any
        return types
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

export const defaultScope = tsKeywords.$.extend({
    email: /^(.+)@(.+)\.(.+)$/,
    alphanumeric: /^[dA-Za-z]+$/,
    alpha: /^[A-Za-z]+$/,
    lowercase: /^[a-z]*$/,
    uppercase: /^[A-Z]*$/,
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
