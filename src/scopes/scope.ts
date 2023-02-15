import type { ResolvedNode, TypeNode } from "../nodes/node.ts"
import { flattenType } from "../nodes/node.ts"
import type { ConfigTuple } from "../parse/ast/config.ts"
import type {
    inferDefinition,
    inferred,
    ParseContext,
    validateDefinition
} from "../parse/definition.ts"
import { parseDefinition } from "../parse/definition.ts"
import type {
    ProblemsConfig,
    ProblemWritersByCode
} from "../traverse/problems.ts"
import { compileProblemWriters } from "../traverse/problems.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import { throwInternalError, throwParseError } from "../utils/errors.ts"
import { deepFreeze } from "../utils/freeze.ts"
import type {
    Dict,
    error,
    evaluate,
    isAny,
    List,
    nominal
} from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { stringifyUnion } from "../utils/unionToTuple.ts"
import type { PrecompiledDefaults } from "./ark.ts"
import { Cache, FreezingCache } from "./cache.ts"
import type { Expressions } from "./expressions.ts"
import type { KeyCheckKind, Type, TypeOptions, TypeParser } from "./type.ts"
import { initializeType } from "./type.ts"

type ScopeParser = {
    <aliases>(aliases: validateAliases<aliases, {}>): Scope<
        parseScope<aliases, {}>
    >

    <aliases, opts extends ScopeOptions>(
        aliases: validateAliases<aliases, opts>,
        opts: validateOptions<opts>
    ): Scope<parseScope<aliases, opts>>
}

type validateAliases<aliases, opts extends ScopeOptions> = {
    [name in keyof aliases]: name extends keyof preresolved<opts>
        ? writeDuplicateAliasesMessage<name & string>
        : validateDefinition<aliases[name], bootstrapScope<aliases, opts>>
}

export type ScopeOptions = {
    // [] allows narrowed tuple inference
    imports?: Space[] | []
    includes?: Space[] | []
    standard?: boolean
    name?: string
    codes?: ProblemsConfig
    keys?: KeyCheckKind
}

export type ScopeConfig = evaluate<{
    keys: KeyCheckKind
    codes: ProblemWritersByCode
}>

export const compileScopeOptions = (opts: ScopeOptions): ScopeConfig => ({
    codes: compileProblemWriters(opts.codes),
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
const spaceRegistry: Record<string, Space | undefined> = {}

export const isConfigTuple = (def: unknown): def is ConfigTuple =>
    Array.isArray(def) && def[1] === ":"

export class Scope<context extends ScopeContext = any> {
    name: string
    config: ScopeConfig
    parseCache = new FreezingCache<TypeNode>()
    #resolutions = new Cache<Type>()
    #exports = new Cache<Type>()

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.name = this.#register(opts)
        if (opts.standard !== false) {
            this.#cacheSpaces([spaceRegistry["standard"]!], "imports")
        }
        if (opts.imports) {
            this.#cacheSpaces(opts.imports, "imports")
        }
        if (opts.includes) {
            this.#cacheSpaces(opts.includes, "includes")
        }
        this.config = compileScopeOptions(opts)
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

    #initializeContext(type: Type): ParseContext {
        return {
            type,
            path: new Path()
        }
    }

    getAnonymousTypeName(ctx?: ParseContext) {
        let base = ctx
            ? ctx.path.length
                ? `${ctx.path}`
                : ctx.type.name
            : "type"
        if (base[0] !== "λ") {
            base = `λ${base}`
        }
        let increment = 1
        let name = base
        while (this.isInternallyResolvable(name)) {
            name = `${base}${++increment}`
        }
        return name
    }

    addAnonymous(type: Type, ctx: ParseContext) {
        if (this.isInternallyResolvable(type.name)) {
            if (type === this.resolve(type.name)) {
                return type.name
            }
            const name = this.getAnonymousTypeName(ctx)
            this.type(["node", type.node] as inferred<unknown>, { name })
            return name
        }
        this.#resolutions.set(type.name, type)
        return type.name
    }

    get infer(): exportsOf<context> {
        return chainableNoOpProxy
    }

    compile() {
        if (!spaceRegistry[this.name]) {
            for (const name in this.aliases) {
                this.resolve(name)
            }
            spaceRegistry[this.name] = this.#exports.root as Space<
                exportsOf<context>
            >
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
        const aliasValue = this.aliases[name]
        if (!aliasValue) {
            return (
                onUnresolvable === "throw"
                    ? throwInternalError(
                          `Unexpectedly failed to resolve alias '${name}'`
                      )
                    : undefined
            ) as ResolveResult<onUnresolvable>
        }
        const type = initializeType(name, aliasValue, undefined, this)
        this.#resolutions.set(name, type)
        this.#exports.set(name, type)
        const ctx = this.#initializeContext(type)
        const resolution = parseDefinition(type.definition, ctx)
        if (typeof resolution === "string") {
            if (seen.includes(resolution)) {
                return throwParseError(
                    writeShallowCycleErrorMessage(name, seen)
                )
            }
            seen.push(resolution)
            const resolvedType = this.#resolveRecurse(resolution, "throw", seen)
            type.node = resolvedType.node
            type.flat = resolvedType.flat
            return type
        }
        type.node = deepFreeze(resolution)
        type.flat = deepFreeze(flattenType(type))
        return type
    }

    resolveNode(node: TypeNode): ResolvedNode {
        return typeof node === "object"
            ? node
            : this.resolveNode(this.resolve(node).node)
    }

    expressions: Expressions<resolutions<context>> = {
        intersection: (l, r, opts) =>
            this.type([l, "&", r] as inferred<unknown>, opts),
        union: (l, r, opts) =>
            this.type([l, "|", r] as inferred<unknown>, opts),
        arrayOf: (def, opts) =>
            this.type([def, "[]"] as inferred<unknown>, opts),
        keyOf: (def, opts) =>
            this.type(["keyof", def] as inferred<unknown>, opts),
        node: (def, opts) =>
            this.type(["node", def] as inferred<unknown>, opts),
        instanceOf: (def, opts) =>
            this.type(["instanceof", def] as inferred<unknown>, opts),
        valueOf: (def, opts) =>
            this.type(["===", def] as inferred<unknown>, opts),
        narrow: (def, fn, opts) =>
            this.type([def, "=>", fn] as inferred<unknown>, opts),
        morph: (def, fn, opts) =>
            this.type([def, "|>", fn] as inferred<unknown>, opts)
    } as Expressions<resolutions<context>>

    intersection = this.expressions.intersection

    union = this.expressions.union

    arrayOf = this.expressions.arrayOf

    keyOf = this.expressions.keyOf

    valueOf = this.expressions.valueOf

    instanceOf = this.expressions.instanceOf

    narrow = this.expressions.narrow

    morph = this.expressions.morph

    type: TypeParser<resolutions<context>> = Object.assign(
        (def: unknown, opts?: TypeOptions) => {
            const name = opts?.name
                ? this.isInternallyResolvable(opts.name)
                    ? throwParseError(writeDuplicateAliasesMessage(opts.name))
                    : opts.name
                : this.getAnonymousTypeName()
            // remove name from opts since we've already used it and otherwise it will
            // interfere with traversal keys being ProblemOptions
            delete opts?.name
            const t = initializeType(name, def, opts, this)
            const ctx = this.#initializeContext(t)
            t.node = deepFreeze(parseDefinition(def, ctx))
            t.flat = deepFreeze(flattenType(t))
            this.#resolutions.set(t.name, t)
            return t
        },
        { from: this.expressions.node }
    ) as TypeParser<resolutions<context>>

    isInternallyResolvable(name: string) {
        return this.#resolutions.has(name) || this.aliases[name]
    }
}

export const scope: ScopeParser = ((aliases: Dict, opts: ScopeOptions = {}) =>
    new Scope(aliases, opts)) as any

export const rootScope: Scope<[{}, {}, false]> = scope(
    {},
    { name: "empty", standard: false }
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
