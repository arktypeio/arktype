import type { ResolvedNode, TraversalNode, TypeNode } from "./nodes/node.js"
import { flattenNode } from "./nodes/node.js"
import type {
    inferDefinition,
    inferred,
    ParseContext,
    validateDefinition
} from "./parse/definition.js"
import { parseDefinition, t } from "./parse/definition.js"
import type { ParsedMorph } from "./parse/tuple/morph.ts"
import { TraversalState, traverse } from "./traverse/check.ts"
import type {
    Problems,
    ProblemsConfig,
    ProblemsOptions
} from "./traverse/problems.ts"
import {
    compileProblemOptions,
    defaultProblemWriters
} from "./traverse/problems.ts"
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

// TODO: Reintegrate thunks/compilation, add utilities for narrowed defs
export type ScopeOptions = {
    // [] allows narrowed tuple inference
    imports?: Space[] | []
    includes?: Space[] | []
    standard?: boolean
    name?: string
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
    : opts["imports"] extends Space[]
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

let anonymousScopeCount = 0
const scopeRegistry: Record<string, Scope | undefined> = {}

export class Scope<context extends ScopeContext = any> {
    name: string
    parseCache = new FreezingCache<TypeNode>()
    #resolutions = new Cache<Type>()
    #exports = new Cache<Type>()

    constructor(public aliases: Dict, public opts: ScopeOptions) {
        this.name = this.#register(opts)
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

    #register(opts: ScopeOptions) {
        const name: string = opts.name
            ? scopeRegistry[opts.name]
                ? throwParseError(`A scope named '${opts.name}' already exists`)
                : opts.name
            : `scope${++anonymousScopeCount}`
        scopeRegistry[name] = this
        return name
    }

    #cacheSpaces(spaces: Space[], kind: "imports" | "includes") {
        for (const space of spaces) {
            for (const name in space) {
                if (this.#resolutions.has(name) || name in this.aliases) {
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
        const result = this.#initializeUnparsedType(
            this.#compileTypeConfig(opts)
        )
        const ctx = this.#initializeContext(result)
        result.node = this.resolveNode(parseDefinition(def, ctx))
        result.flat = flattenNode(result.node, result)
        return result
    }) as TypeParser<resolutions<context>>

    #compileTypeConfig(opts: TypeOptions): TypeConfig {
        // TODO: merge scope options?
        const typeName = opts.name ?? "(anonymous)"
        return {
            name: typeName,
            id: `${this.name}.${typeName}`,
            problems: compileProblemOptions(opts.problems)
        }
    }

    #initializeContext(type: Type): ParseContext {
        return {
            type,
            path: new Path()
        }
    }

    #initializeUnparsedType(config: TypeConfig): Type {
        const name = config.name
        // dynamically assign a name to the primary traversal function
        const namedTraverse: Checker<unknown> = {
            [name]: (data: unknown) => {
                const state = new TraversalState(type)
                const out = traverse(data, type.flat, state)
                return state.problems.length
                    ? { problems: state.problems }
                    : { data, out }
            }
        }[name]
        const type = Object.assign(namedTraverse, {
            // temporarily set node/flat to aliases that will be included in
            // the final type in case of cyclic resolutions
            node: name,
            flat: [["alias", name]],
            config,
            // TODO: remove this at runtime
            [t]: chainableNoOpProxy,
            infer: chainableNoOpProxy,
            includesMorph: false,
            scope: this
        } satisfies TypeRoot)
        return type
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

    addReferenceIfResolvable(name: name<context>, ctx: ParseContext) {
        const resolution = this.#resolveRecurse(name, "undefined", [])
        if (!resolution) {
            return false
        }
        ctx.type.includesMorph ||= resolution.includesMorph
        return true
    }

    resolve(name: name<context>) {
        return this.#resolveRecurse(name, "throw", [])
    }

    #resolveRecurse<onUnresolvable extends "undefined" | "throw">(
        name: string,
        onUnresolvable: onUnresolvable,
        seen: string[]
    ): ResolveResult<onUnresolvable> {
        const maybeCacheResult = this.#resolutions.get(name)
        if (maybeCacheResult) {
            return maybeCacheResult
        }
        if (!this.aliases[name]) {
            return (
                onUnresolvable === "throw"
                    ? throwInternalError(
                          `Unexpectedly failed to resolve alias '${name}'`
                      )
                    : undefined
            ) as ResolveResult<onUnresolvable>
        }
        // TODO: opts?
        const result = this.#initializeUnparsedType({
            name,
            id: `${this.name}.${name}`,
            problems: defaultProblemWriters
        })
        this.#resolutions.set(name, result)
        this.#exports.set(name, result)
        const ctx = this.#initializeContext(result)
        let resolution = parseDefinition(this.aliases[name], ctx)
        if (typeof resolution === "string") {
            if (seen.includes(resolution)) {
                return throwParseError(
                    writeShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(resolution)
            resolution = this.#resolveRecurse(resolution, "throw", seen).node
        }
        result.node = resolution
        result.flat = flattenNode(resolution, result)
        return result
    }

    resolveNode(node: TypeNode): ResolvedNode {
        if (typeof node === "object") {
            return node
        }
        return this.resolveNode(this.resolve(node).node)
    }
}

type OnUnresolvable = "throw" | "undefined"

type ResolveResult<onUnresolvable extends OnUnresolvable> =
    onUnresolvable extends "throw" ? Type : Type | undefined

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
    { name: "ts", standard: false }
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
    { name: "validation", standard: false }
)

const validationTypes = validation.compile()

const standard = scope(
    {},
    {
        name: "standard",
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
// TODO: to class?
type TypeRoot<t = unknown> = {
    [t]: t
    infer: asOut<t>
    config: TypeConfig
    node: TypeNode
    flat: TraversalNode
    includesMorph: boolean
    scope: Scope
}

export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>

export type TypeOptions = {
    // TODO: validate not already a name
    name?: string
    problems?: ProblemsOptions
}

export type QualifiedTypeName = `${string}.${string}`

export type TypeConfig = {
    name: string
    id: QualifiedTypeName
    problems: ProblemsConfig
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
