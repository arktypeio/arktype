import { CompilationState, createTraverse } from "./nodes/node.js"
import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import { CheckResult, TraversalState } from "./nodes/traverse.js"
import type { ConfigTuple } from "./parse/ast/config.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import { ark, type PrecompiledDefaults } from "./scopes/ark.js"
import type { KeyCheckKind, Type, TypeOptions, TypeParser } from "./type.js"
import { throwInternalError, throwParseError } from "./utils/errors.js"
import { deepFreeze } from "./utils/freeze.js"
import type {
    Dict,
    error,
    evaluate,
    isAny,
    List,
    nominal
} from "./utils/generics.js"
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

type validateAliases<aliases, opts extends ScopeOptions> = evaluate<{
    [name in keyof aliases]: name extends keyof preresolved<opts>
        ? writeDuplicateAliasesMessage<name & string>
        : validateDefinition<aliases[name], bootstrapScope<aliases, opts>>
}>

export type ScopeOptions = {
    // [] allows narrowed tuple inference
    imports?: Space[] | []
    includes?: Space[] | []
    standard?: boolean
    name?: string
    // TODO: Fix
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type ScopeConfig = evaluate<{
    readonly keys: KeyCheckKind
    readonly codes: ProblemOptionsByCode
}>

export const compileScopeOptions = (opts: ScopeOptions): ScopeConfig => ({
    codes: {},
    keys: opts.keys ?? "loose"
})

type validateOptions<opts extends ScopeOptions> = {
    [k in keyof opts]: k extends "imports" | "includes"
        ? mergeSpaces<
              opts[k],
              // if includes and imports are both defined, ensure no spaces from
              // includes duplicate aliases from imports by using merged imports
              // as a base
              [k, "imports"] extends ["includes", keyof opts]
                  ? mergeSpaces<opts["includes"]>
                  : {}
          > extends error<infer e>
            ? e
            : opts[k]
        : opts[k]
}

export type ScopeInferenceContext = Dict | ScopeContextTuple

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

type exportsOf<context extends ScopeInferenceContext> = context extends [
    infer exports,
    ...unknown[]
]
    ? exports
    : context

type localsOf<context extends ScopeInferenceContext> = context extends List
    ? context["1"] & (context["2"] extends false ? {} : PrecompiledDefaults)
    : PrecompiledDefaults

type mergeSpaces<scopes, base extends Dict = {}> = scopes extends readonly [
    Space<infer head>,
    ...infer tail
]
    ? keyof base & keyof head extends never
        ? mergeSpaces<tail, base & head>
        : error<
              writeDuplicateAliasesMessage<
                  stringifyUnion<keyof base & keyof head & string>
              >
          >
    : base

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

type resolutions<context extends ScopeInferenceContext> = localsOf<context> &
    exportsOf<context>

type name<context extends ScopeInferenceContext> = keyof resolutions<context> &
    string

export const isConfigTuple = (def: unknown): def is ConfigTuple =>
    Array.isArray(def) && def[1] === ":"

let anonymousScopeCount = 0
const scopeRegistry: Record<string, Scope | undefined> = {}

export class Scope<context extends ScopeInferenceContext = any> {
    declare infer: exportsOf<context>

    readonly name: string
    readonly config: ScopeConfig
    // TODO: runtime error for overlapping aliases?
    imports: Space[]
    includes: Space[]
    types: Partial<Space<this["infer"]>> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.name = this.#register(opts)
        this.config = compileScopeOptions(opts)
        this.imports = opts.imports ?? []
        this.includes = opts.includes ?? []
        if (opts.standard !== false) {
            this.imports.push(ark)
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

    #compiled = false
    compile() {
        if (this.#compiled) {
            return this.types as Space<this["infer"]>
        }
        let name: name<context>
        for (name in this.aliases) {
            this.types[name] ??= this.resolve(name) as Type<any>
        }
        this.#compiled = true
        return this.types
    }

    resolve(name: name<context>) {
        return this.#resolveRecurse(name, "throw", [name])
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
        const aliasDef = this.aliases[name]
        if (!aliasDef) {
            return (
                onUnresolvable === "throw"
                    ? throwInternalError(
                          `Unexpectedly failed to resolve alias '${name}'`
                      )
                    : undefined
            ) as ResolveResult<onUnresolvable>
        }
        const t = initializeType(name, aliasDef, {}, this)
        const ctx = this.#initializeContext(t)
        this.#resolutions.set(name, t)
        this.#exports.set(name, t)
        let node = parseDefinition(aliasDef, ctx)
        if (typeof node === "string") {
            if (seen.includes(node)) {
                return throwParseError(
                    writeShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(node)
            node = this.#resolveRecurse(node, "throw", seen).node
        }
        t.node = deepFreeze(node)
        t.ts = t.node.compile(new CompilationState(t))
        t.traverse = createTraverse(t.name, t.ts)
        t.check = (data) => {
            const state = new TraversalState(t)
            t.traverse(data, state)
            const result = new CheckResult(state)
            if (state.problems.count) {
                result.problems = state.problems
            } else {
                for (const [o, k] of state.entriesToPrune) {
                    delete o[k]
                }
                result.data = {}
                //state.data
            }
            return result
        }
        return t
    }

    type: TypeParser<resolutions<context>> = Object.assign(
        (def: unknown, config: TypeOptions = {}) => {
            const t = initializeType("λtype", def, config, this)
            const ctx = this.#initializeContext(t)
            const root = parseDefinition(def, ctx)
            t.node = deepFreeze(root)
            // TODO: refactor
            // TODO: each node should compile completely or until
            // it hits a loop with itself. it should rely on other nodes that
            // have been compiled the same way, parametrized with the current path.
            t.ts = t.node.compile(new CompilationState(t))
            t.traverse = createTraverse(t.name, t.ts)
            t.check = (data) => {
                const state = new TraversalState(t)
                t.traverse(data, state)
                const result = new CheckResult(state)
                if (state.problems.count) {
                    result.problems = state.problems
                } else {
                    for (const [o, k] of state.entriesToPrune) {
                        delete o[k]
                    }
                    //state.data
                    result.data = {}
                }
                return result
            }
            return t
        }
    ) as TypeParser<resolutions<context>>

    isResolvable(name: string) {
        return this.#resolutions.has(name) || this.aliases[name]
    }
}

export const scope: ScopeParser = ((aliases: Dict, opts: ScopeOptions = {}) =>
    new Scope(aliases, opts)) as any

export const rootScope: Scope<[{}, {}, false]> = scope(
    {},
    { name: "root", standard: false }
) as any

export const rootType: TypeParser<{}> = rootScope.type

type OnUnresolvable = "throw" | "undefined"

type ResolveResult<onUnresolvable extends OnUnresolvable> =
    onUnresolvable extends "throw" ? Type : Type | undefined

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
