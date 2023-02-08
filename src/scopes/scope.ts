import type { ResolvedNode, TypeNode } from "../nodes/node.js"
import { flattenType } from "../nodes/node.js"
import type {
    inferDefinition,
    ParseContext,
    validateDefinition
} from "../parse/definition.js"
import { parseDefinition } from "../parse/definition.js"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type {
    Dict,
    error,
    evaluateObject,
    isAny,
    List,
    nominal
} from "../utils/generics.js"
import { Path } from "../utils/paths.js"
import type { stringifyUnion } from "../utils/unionToTuple.js"
import { Cache, FreezingCache } from "./cache.js"
import type { PrecompiledDefaults } from "./standard.js"
import { standard } from "./standard.js"
import type { Type, TypeOptions, TypeParser } from "./type.js"
import { initializeType } from "./type.js"

type ScopeParser = {
    <aliases>(aliases: validateAliases<aliases, {}>): Scope<
        parseScope<aliases, {}>
    >

    <aliases, opts extends ScopeOptions>(
        aliases: validateAliases<aliases, opts>,
        opts: validateOptions<opts>
    ): Scope<parseScope<aliases, opts>>
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
        : error<
              writeDuplicateAliasesMessage<
                  stringifyUnion<keyof base & keyof head & string>
              >
          >
    : base

type validateAliases<aliases, opts extends ScopeOptions> = {
    [name in keyof aliases]: name extends keyof preresolved<opts>
        ? writeDuplicateAliasesMessage<name & string>
        : validateDefinition<aliases[name], bootstrapScope<aliases, opts>>
}

type preresolved<opts extends ScopeOptions> = includesOf<opts> &
    importsOf<opts> &
    (opts["standard"] extends false ? {} : PrecompiledDefaults)

type alias<def = {}> = nominal<def, "alias">

type bootstrapScope<aliases, opts extends ScopeOptions> = {
    [k in keyof aliases]: alias<aliases[k]>
} & preresolved<opts>

type inferExports<aliases, opts extends ScopeOptions> = evaluateObject<
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
    #anonymousTypeCount = 0

    constructor(public aliases: Dict, public opts: ScopeOptions) {
        this.name = this.#register(opts)
        if (opts.standard !== false) {
            this.#cacheSpaces([standard], "imports")
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
                    throwParseError(writeDuplicateAliasesMessage(name))
                }
                this.#resolutions.set(name, space[name])
                if (kind === "includes") {
                    this.#exports.set(name, space[name])
                }
            }
        }
    }

    type = ((def, opts: TypeOptions = {}) => {
        if (opts.name && this.aliases[opts.name]) {
            return throwParseError(writeDuplicateAliasesMessage(opts.name))
        }
        const result = initializeType(def, opts, this)
        const ctx = this.#initializeContext(result)
        result.node = this.resolveNode(parseDefinition(def, ctx))
        result.flat = flattenType(result)
        return result
    }) as TypeParser<resolutions<context>>

    #initializeContext(type: Type): ParseContext {
        return {
            type,
            path: new Path()
        }
    }

    createAnonymousTypeSuffix() {
        return ++this.#anonymousTypeCount
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
        ctx.type.meta.includesMorph ||= resolution.meta.includesMorph
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
        const type = initializeType(this.aliases[name], { name }, this)
        this.#resolutions.set(name, type)
        this.#exports.set(name, type)
        const ctx = this.#initializeContext(type)
        let resolution = parseDefinition(type.meta.definition, ctx)
        if (typeof resolution === "string") {
            if (seen.includes(resolution)) {
                return throwParseError(
                    writeShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(resolution)
            resolution = this.#resolveRecurse(resolution, "throw", seen).node
        }
        type.node = resolution
        type.flat = flattenType(type)
        return type
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

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const scope: ScopeParser = ((aliases: Dict, opts: ScopeOptions = {}) =>
    new Scope(aliases, opts)) as any

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
