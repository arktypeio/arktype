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
    conform,
    Dict,
    error,
    evaluate,
    extend,
    nominal,
    stringKeyOf
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import type { stringifyUnion } from "./utils/unionToTuple.ts"

export const composeTypeParser = <$ extends Scope>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveNode(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    })

type ScopeParser = LazyDynamicWrap<InferredScopeParser, DynamicScopeParser>

// [] allows tuple inferences
type ScopeList = [] | readonly Scope[]

// TODO: Reintegrate thunks/compilation? Add utilities for narrowed defs
export type ScopeOptions = {
    imports?: ScopeList
    exports?: ScopeList
}

type validateOptions<opts extends ScopeOptions> = {
    imports?: mergeScopes<opts["imports"]> extends error<infer e>
        ? e
        : opts["imports"]
    exports?: mergeScopes<opts["exports"]> extends error<infer e>
        ? e
        : opts["exports"]
}

type compileConfig<opts extends ScopeOptions> = evaluate<{
    exports: mergeScopes<opts["exports"]>
    imports: unknown extends opts["imports"]
        ? PrecompiledDefaults
        : mergeScopes<opts["imports"], mergeScopes<opts["exports"]>>
}>

export type ScopeConfig = {
    exports: Dict
    imports: Dict
}

type InferredScopeParser = <aliases, opts extends ScopeOptions = {}>(
    aliases: validateScope<aliases, compileConfig<opts>>,
    opts?: conform<opts, validateOptions<opts>>
) => Scope<inferAliases<aliases, compileConfig<opts>>, compileConfig<opts>>

type DynamicScopeParser = <
    aliases extends Dict,
    opts extends ScopeOptions = {}
>(
    aliases: aliases,
    opts?: validateOptions<opts>
) => Scope<aliasesOf<aliases>, compileConfig<opts>>

// TODO: defer to fix instanceof inference

type mergeScopes<
    // TODO: Slower if I check extends ScopeList?
    scopes extends ScopeList | undefined,
    base extends Dict = {}
> = scopes extends readonly [Scope<infer head>, ...infer tail extends ScopeList]
    ? keyof head & keyof base extends never
        ? mergeScopes<tail, base & head>
        : error<`Duplicates ${stringifyUnion<
              keyof head & keyof base & string
          >}`>
    : base

type validateScope<aliases, config extends ScopeConfig> = {
    [name in keyof aliases]: name extends stringKeyOf<config["imports"]>
        ? writeDuplicateAliasMessage<name>
        : validateDefinition<
              aliases[name],
              inferAliases<aliases, config> & config["imports"]
          >
}

type inferAliases<aliases, config extends ScopeConfig> = evaluate<{
    [k in keyof aliases]: inferDefinition<
        aliases[k],
        {
            [k in keyof aliases]: BootstrapScope<aliases[k]>
        } & config["imports"]
    >
}>

type ScopeCache = {
    nodes: { [def in string]?: TypeNode }
    types: { [name in string]?: Type }
}

export type Space<root = Dict> = { [k in keyof root]: Type<root[k]> }

type aliasesOf<root = Dict> = { readonly [k in keyof root]: unknown }

// TODO: Figure out import caching

// TODO: possible to use scope at type level as well?
export class Scope<resolutions = any, config extends ScopeConfig = any> {
    cache: ScopeCache = {
        nodes: {},
        types: {}
    }

    type: TypeParser<resolutions>

    constructor(public aliases: Dict, public opts: ScopeOptions) {
        this.type = composeTypeParser(this as any)
        // TODO: improve the efficiency of this for defaultScope
        if (!opts.exports && !opts.imports) {
            this.aliases = aliases as any
            return
        }
        const mergedAliases = { ...aliases }
        const mergedLocals = { ...aliases }
        // TODO: improve
        for (const parent of [
            ...(opts.imports ?? []),
            ...(opts.exports ?? [])
        ]) {
            for (const name in parent.aliases) {
                if (name in mergedAliases) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                mergedLocals[name] = parent.aliases[name]
                if (opts.exports?.includes(parent as never)) {
                    mergedAliases[name] = parent.aliases[name]
                    this.cache.types[name] = parent.cache.types[name]
                }
            }
            for (const def in parent.cache.nodes) {
                if (!this.cache.nodes[def]) {
                    this.cache.nodes[def] = parent.cache.nodes
                }
            }
        }
        this.aliases = mergedAliases as any
        this.resolutions = mergedLocals as any
    }

    get infer(): { [k in keyof resolutions]: resolutions[k] } & {
        [k in keyof config["exports"]]: config["exports"][k]
    } {
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
        return types as Space<this["infer"]>
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

export const scope = lazyDynamicWrap(
    (aliases: Dict, opts: ScopeOptions = {}) => new Scope(aliases, opts)
) as any as ScopeParser

const ts = scope(
    {
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
    },
    { imports: [] }
)

const validation = scope(
    {
        email: /^(.+)@(.+)\.(.+)$/,
        alphanumeric: /^[dA-Za-z]+$/,
        alpha: /^[A-Za-z]+$/,
        lowercase: /^[a-z]*$/,
        uppercase: /^[A-Z]*$/,
        integer: ["node", { number: { divisor: 1 } }]
    },
    { imports: [] }
)

// TODO: how much startup time does this add?
export const scopes = {
    ts,
    validation,
    default: scope(
        {},
        {
            exports: [ts, validation]
        }
    )
}

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
type ValidateDefaultScope = [
    // if PrecompiledDefaults gets out of sync with scopes.default, there will be a type error here
    extend<PrecompiledDefaults, typeof scopes["default"]["infer"]>,
    extend<typeof scopes["default"]["infer"], PrecompiledDefaults>
]

export const type: TypeParser<PrecompiledDefaults> =
    composeTypeParser(validation)

export type BootstrapScope<$ = {}> = nominal<$, "bootstrap">

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`
