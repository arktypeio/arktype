import type { TraversalNode, TypeNode, TypeReference } from "./nodes/node.js"
import { flattenNode } from "./nodes/node.js"
import type {
    inferDefinition,
    inferred,
    ParseContext,
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
import { deepFreeze } from "./utils/freeze.ts"
import type {
    defer,
    Dict,
    error,
    evaluate,
    extend,
    isAny,
    List,
    nominal,
    xor
} from "./utils/generics.js"
import { Path } from "./utils/paths.ts"
import type { stringifyUnion } from "./utils/unionToTuple.js"

type ScopeParser = {
    <aliases>(aliases: validateAliases<aliases, {}>): Scope<
        parseScope<aliases, {}>
    >

    <aliases, opts extends ScopeOptions>(
        aliases: validateAliases<aliases, opts>,
        opts: validateOptions<opts>
    ): Scope<parseScope<aliases, opts>>
}

export type TypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

// [] allows tuple inferences
type SpaceList = [] | readonly Space[]

// TODO: Reintegrate thunks/compilation, add utilities for narrowed defs
export type ScopeOptions = {
    imports?: SpaceList
    includes?: SpaceList
    standard?: boolean
}

type validateOptions<opts extends ScopeOptions> = {
    [k in keyof opts]: k extends "imports" | "includes"
        ? mergeSpaces<opts[k]> extends error<infer e>
            ? e
            : opts[k]
        : opts[k]
}

export type ScopeContext = Dict | ScopeContextTuple

type ScopeContextTuple = [exports: Dict, locals: Dict, standard?: false]

type parseScope<
    aliases,
    opts extends ScopeOptions
> = opts["standard"] extends false
    ? [inferExports<aliases, opts>, importsOf<opts>, false]
    : opts["imports"] extends SpaceList
    ? [inferExports<aliases, opts>, importsOf<opts>]
    : inferExports<aliases, opts>

type importsOf<opts extends ScopeOptions> = unknown extends opts["imports"]
    ? {}
    : mergeSpaces<opts["imports"]>

type includesOf<opts extends ScopeOptions> = unknown extends opts["includes"]
    ? {}
    : mergeSpaces<opts["includes"]>

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

type mergeSpaces<scopes, base extends Dict = {}> = scopes extends readonly [
    Space<infer head>,
    ...infer tail
]
    ? keyof base & keyof head extends never
        ? mergeSpaces<tail, base & head>
        : // TODO: add tests for this
          error<`Duplicates ${stringifyUnion<
              keyof base & keyof head & string
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

export type Space<exports = Dict> = {
    [k in keyof exports]: Type<exports[k]>
}

type resolutions<context extends ScopeContext> = localsOf<context> &
    exportsOf<context>

type name<context extends ScopeContext> = keyof resolutions<context> & string

export class Scope<context extends ScopeContext = any> {
    parseCache = new FreezingCache<TypeReference>()
    #resolutions = new Cache<Type>()
    #exports = new Cache<Type>()

    constructor(public aliases: Dict, public opts: ScopeOptions) {
        if (opts.standard !== false) {
            this.#cacheSpaces([standardTypes], "imports")
        }
        if (opts.imports) {
            this.#cacheSpaces(opts.imports, "imports")
        }
        if (opts.includes) {
            this.#cacheSpaces(opts.includes, "includes")
        }
    }

    #cacheSpaces(spaces: SpaceList, kind: "imports" | "includes") {
        for (const space of spaces) {
            for (const name in space) {
                if (this.isResolvable(name)) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                this.#resolutions.set(name, space[name])
                if (kind === "includes") {
                    this.#exports.set(name, space[name])
                }
            }
        }
    }

    type = ((def, opts: TypeOptions = {}) => {
        const ctx = this.#initializeContext("(anonymous)")
        const root = this.resolveIfIdentifier(parseDefinition(def, ctx))
        const flat = flattenNode(root, ctx)
        return this.#typeFrom(root, flat, opts)
    }) as TypeParser<resolutions<context>>

    #initializeContext(name: string): ParseContext {
        return {
            $: this,
            path: new Path(),
            name
        }
    }

    get infer(): exportsOf<context> {
        return chainableNoOpProxy
    }

    #compiled = false
    compile() {
        if (!this.#compiled) {
            for (const name in this.aliases) {
                this.resolve(name)
            }
            this.#compiled = true
        }
        return this.#exports.root as Space<exportsOf<context>>
    }

    isResolvable(name: string) {
        return this.#resolutions.has(name) || name in this.aliases
    }

    resolve(name: name<context>) {
        return this.#resolveRecurse(name, [])
    }

    #resolveRecurse(name: string, seen: string[]): Type {
        const maybeCacheResult = this.#resolutions.get(name)
        if (maybeCacheResult) {
            return maybeCacheResult
        }
        if (!this.aliases[name]) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias '${name}'`
            )
        }
        const ctx = this.#initializeContext(name)
        let resolution = parseDefinition(this.aliases[name], ctx)
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
        this.#resolutions.set(name, type)
        this.#exports.set(name, type)
        type.flat = flattenNode(resolution, ctx)
        return type
    }

    resolveIfIdentifier(node: TypeReference): TypeNode {
        return typeof node === "string" ? this.resolve(node).node : node
    }

    #typeFrom(node: TypeNode, flat: TraversalNode, config: TypeOptions): Type {
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
        )
    }
}

class Cache<item = unknown> {
    protected cache: { [name in string]?: item } = {}

    get root(): { readonly [name in string]?: item } {
        return this.cache
    }

    has(name: string) {
        return name in this.cache
    }

    get(name: string) {
        return this.cache[name]
    }

    set(name: string, item: item) {
        this.cache[name] = item
        return item
    }
}

class FreezingCache<item = unknown> extends Cache<item> {
    override set(name: string, item: item) {
        this.cache[name] = deepFreeze(item) as item
        return item
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

const tsTypes = ts.compile()

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

const validationTypes = validation.compile()

const standard = scope(
    {},
    {
        includes: [tsTypes, validationTypes],
        standard: false
    }
)

const standardTypes = standard.compile()

export const scopes = {
    ts,
    validation,
    standard
}

export const spaces = {
    ts: tsTypes,
    validation: validationTypes,
    standard: standardTypes
} satisfies Record<keyof typeof scopes, Space>

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

type Checker<t> = (data: unknown) => Result<t>

// TODO: add methods like .intersect, etc.
type TypeRoot<t = unknown> = {
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
