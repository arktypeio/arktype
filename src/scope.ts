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
    isAny,
    List,
    nominal,
    replaceProps
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
    includes?: ScopeList
    standard?: boolean
}

type validateOptions<opts extends ScopeOptions> = replaceProps<
    opts,
    {
        imports?: mergeScopes<opts["imports"]> extends error<infer e>
            ? e
            : opts["imports"]
        includes?: mergeScopes<opts["includes"]> extends error<infer e>
            ? e
            : opts["includes"]
    }
>

export type ScopeContext = Dict | ScopeContextTuple

type ScopeContextTuple = [exports: Dict, locals: Dict, standard?: false]

type parseScope<
    aliases,
    opts extends ScopeOptions
> = opts["standard"] extends false
    ? [inferExports<aliases, opts>, importsOf<opts>, false]
    : opts["imports"] extends ScopeList
    ? [inferExports<aliases, opts>, importsOf<opts>]
    : inferExports<aliases, opts>

type importsOf<opts extends ScopeOptions> = unknown extends opts["imports"]
    ? {}
    : mergeScopes<opts["imports"]>

type includesOf<opts extends ScopeOptions> = unknown extends opts["includes"]
    ? {}
    : mergeScopes<opts["includes"]>

type InferredScopeParser = <aliases, opts extends ScopeOptions = {}>(
    aliases: validateAliases<aliases, opts>,
    opts?: conform<opts, validateOptions<opts>>
) => Scope<parseScope<aliases, opts>>

type DynamicScopeParser = <
    aliases extends Dict,
    opts extends ScopeOptions = {}
>(
    aliases: aliases,
    opts?: validateOptions<opts>
) => Scope<parseScope<{ [k in keyof aliases]: inferred<unknown> }, opts>>

export type resolve<name extends keyof $, $> = isAny<$[name]> extends true
    ? any
    : $[name] extends alias<infer def>
    ? inferDefinition<def, $>
    : $[name]

type exportsOf<context extends ScopeContext> = context extends [
    infer exports,
    ...unknown[]
]
    ? exports
    : context

type localsOf<context extends ScopeContext> = context extends List
    ? context["1"] & (context["2"] extends false ? {} : PrecompiledDefaults)
    : PrecompiledDefaults

type mergeScopes<scopes, base extends Dict = {}> = scopes extends readonly [
    Scope<infer context>,
    ...infer tail
]
    ? keyof base & keyof exportsOf<context> extends never
        ? mergeScopes<tail, base & exportsOf<context>>
        : error<`Duplicates ${stringifyUnion<
              keyof base & keyof exportsOf<context> & string
          >}`>
    : base

type validateAliases<aliases, opts extends ScopeOptions> = {
    [name in keyof aliases]: name extends keyof preresolved<opts>
        ? writeDuplicateAliasMessage<name & string>
        : validateDefinition<aliases[name], bootstrapScope<aliases, opts>>
}

type preresolved<opts extends ScopeOptions> = includesOf<opts> &
    importsOf<opts> &
    (opts["standard"] extends false ? {} : PrecompiledDefaults)

type alias<def = {}> = nominal<def, "alias">

type bootstrapScope<aliases, opts extends ScopeOptions> = {
    [k in keyof aliases]: alias<aliases[k]>
} & preresolved<opts>

type inferExports<aliases, opts extends ScopeOptions> = evaluate<
    {
        [k in keyof aliases]: inferDefinition<
            aliases[k],
            bootstrapScope<aliases, opts>
        >
    } & includesOf<opts>
>

type ScopeCache = {
    nodes: { [def in string]?: TypeNode }
    locals: { [name in string]?: Type }
    exports: { [name in string]?: Type }
}

export type Space<exports = Dict> = {
    [k in keyof exports]: Type<exports[k]>
}

type resolvablesOf<context extends ScopeContext> = localsOf<context> &
    exportsOf<context>

export class Scope<context extends ScopeContext = any> {
    cache: ScopeCache = {
        nodes: {},
        locals: {},
        exports: {}
    }

    constructor(public aliases: Dict, public opts: ScopeOptions) {
        if (opts.imports) {
            for (const $ of opts.imports) {
                for (const name in $.cache.exports) {
                    if (name in this.aliases || name in this.cache.locals) {
                        throwParseError(writeDuplicateAliasMessage(name))
                    }
                    this.cache.locals[name] = $.cache.exports[name]
                }
            }
        }
        if (opts.includes) {
            for (const $ of opts.includes) {
                for (const name in $.cache.exports) {
                    if (name in this.aliases || name in this.cache.locals) {
                        throwParseError(writeDuplicateAliasMessage(name))
                    }
                    this.cache.locals[name] = $.cache.exports[name]
                    this.cache.exports[name] = $.cache.exports[name]
                }
            }
        }
    }

    type: TypeParser<resolvablesOf<context>> = composeTypeParser(this)

    get infer(): exportsOf<context> {
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
        return types as Space<exportsOf<context>>
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
            // TODO: defer to fix instanceof inference
        ] as inferred<Function>
    },
    { standard: false }
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
    { standard: false }
)

export const scopes = {
    ts,
    validation,
    default: scope(
        {},
        {
            includes: [ts, validation]
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

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`
