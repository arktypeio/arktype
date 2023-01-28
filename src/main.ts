import type { TraversalNode, TypeNode, TypeReference } from "./nodes/node.js"
import { flattenNode } from "./nodes/node.js"
import type {
    inferDefinition,
    inferred,
    validateDefinition
} from "./parse/definition.js"
import { parseDefinition, t } from "./parse/definition.js"
import type { ParsedMorph } from "./parse/tuple/morph.ts"
import type { ProblemsOptions } from "./traverse/check.ts"
import { traverse } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { Domain } from "./utils/domains.js"
import { throwInternalError, throwParseError } from "./utils/errors.js"
import { deepFreeze } from "./utils/freeze.js"
import type {
    conform,
    defer,
    Dict,
    error,
    evaluate,
    extend,
    isAny,
    List,
    nominal,
    replaceProps,
    xor
} from "./utils/generics.js"
import { hasKey } from "./utils/generics.js"
import type { stringifyUnion } from "./utils/unionToTuple.js"

type ScopeParser = <aliases, opts extends ScopeOptions = {}>(
    aliases: validateAliases<aliases, opts>,
    opts?: conform<opts, validateOptions<opts>>
) => Scope<parseScope<aliases, opts>>

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
    nodes: { [def in string]?: TypeReference }
    resolutions: { [name in string]?: Type }
    exports: { [name in string]?: Type }
    compiled: boolean
}

export type Space<exports = Dict> = {
    [k in keyof exports]: Type<exports[k]>
}

type resolutions<context extends ScopeContext> = localsOf<context> &
    exportsOf<context>

type name<context extends ScopeContext> = keyof resolutions<context> & string

export class Scope<context extends ScopeContext = any> {
    #cache: ScopeCache = {
        nodes: {},
        resolutions: {},
        exports: {},
        compiled: false
    }

    constructor(public aliases: Dict, public opts: ScopeOptions) {
        if (opts.standard !== false) {
            this.#cacheResolutions([scopes.standard.compile()], "imports")
        }
        if (opts.imports) {
            this.#cacheResolutions(
                opts.imports.map(($) => $.compile()),
                "imports"
            )
        }
        if (opts.includes) {
            this.#cacheResolutions(
                opts.includes.map(($) => $.compile()),
                "includes"
            )
        }
    }

    #cacheResolutions(spaces: Space[], kind: "imports" | "includes") {
        for (const space of spaces) {
            for (const name in space) {
                if (this.isResolvable(name)) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                this.#cache.resolutions[name] = space[name]
                if (kind === "includes") {
                    this.#cache.exports[name] = space[name]
                }
            }
        }
    }

    type = ((def, opts: TypeOptions = {}) => {
        const root = this.resolveNode(parseDefinition(def, this))
        const flat = flattenNode(root, this)
        return this.#typeFrom(root, flat, opts)
    }) as TypeParser<resolutions<context>>

    get infer(): exportsOf<context> {
        return chainableNoOpProxy
    }

    compile() {
        if (!this.#cache.compiled) {
            for (const name in this.aliases) {
                if (!this.#cache.exports[name]) {
                    this.#cache.exports[name] = this.resolve(name)
                }
            }
            this.#cache.compiled = true
        }
        return this.#cache.exports as Space<exportsOf<context>>
    }

    isResolvable(name: string) {
        return this.#cache.resolutions[name] || this.aliases[name]
            ? true
            : false
    }

    resolve(name: name<context>) {
        return this.#resolveRecurse(name, [])
    }

    #resolveRecurse(name: string, seen: string[]): Type {
        if (hasKey(this.#cache.resolutions, name)) {
            return this.#cache.resolutions[name]
        }
        if (!this.aliases[name]) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias '${name}'`
            )
        }
        let resolution = parseDefinition(this.aliases[name], this)
        if (typeof resolution === "string") {
            if (seen.includes(resolution)) {
                return throwParseError(
                    writeShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(resolution)
            resolution = this.#resolveRecurse(resolution, seen).node
        }
        // TODO: Figure out type options here
        // temporarily set the TraversalNode to an alias that will be used for cyclic resolutions
        const type = this.#typeFrom(resolution, [["alias", name]], {})
        this.#cache.resolutions[name] = type
        type.flat = flattenNode(resolution, this)
        return type
    }

    resolveNode(node: TypeReference): TypeNode {
        return typeof node === "string" ? this.resolve(node).node : node
    }

    #typeFrom(node: TypeNode, flat: TraversalNode, config: TypeOptions) {
        return Object.assign(
            (data: unknown) => {
                return traverse(data, flat, this, config)
            },
            {
                [t]: chainableNoOpProxy,
                infer: chainableNoOpProxy,
                config,
                node,
                flat
            }
        ) as Type
    }

    // TODO: cache class
    getCached(def: string): TypeReference | undefined {
        if (hasKey(this.#cache.nodes, def)) {
            return this.#cache.nodes[def]
        }
    }

    setCache(def: string, node: TypeReference) {
        this.#cache.nodes[def] = deepFreeze(node)
        return node
    }
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

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

export const scope: ScopeParser = ((aliases: Dict, opts: ScopeOptions = {}) =>
    new Scope(aliases, opts)) as any

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

const standard = scope(
    {},
    {
        includes: [ts, validation],
        standard: false
    }
)

export const scopes = {
    ts,
    validation,
    standard
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
    // if PrecompiledDefaults gets out of sync with scopes.standard, there will be a type error here
    extend<PrecompiledDefaults, typeof scopes["standard"]["infer"]>,
    extend<typeof scopes["standard"]["infer"], PrecompiledDefaults>
]

export const type: TypeParser<PrecompiledDefaults> = scopes.standard.type

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type TypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

export type parseType<def, $> = def extends validateDefinition<def, $>
    ? Type<inferDefinition<def, $>>
    : never

export type Result<t> = xor<
    {
        data: asIn<t>
        out: asOut<t>
    },
    { problems: Problems }
>

export type Checker<t> = (data: unknown) => Result<t>

// TODO: add methods like .intersect, etc.
export type TypeRoot<t = unknown> = {
    [t]: t
    infer: asOut<t>
    node: TypeNode
    flat: TraversalNode
}

export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>

export type TypeOptions = {
    problems?: ProblemsOptions
}

export type asIn<t> = asIo<t, "in">

export type asOut<t> = asIo<t, "out">

type asIo<t, io extends "in" | "out"> = t extends ParsedMorph<infer i, infer o>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends Function
        ? t
        : { [k in keyof t]: asIo<t[k], io> }
    : t
