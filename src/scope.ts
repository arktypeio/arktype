import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import type { ConfigTuple } from "./parse/ast/config.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import type { Ark } from "./scopes/ark.js"
import type { KeyCheckKind, TypeOptions, TypeParser } from "./type.js"
import { Type } from "./type.js"
import { throwParseError } from "./utils/errors.js"
import type {
    Dict,
    error,
    evaluate,
    isAny,
    List,
    nominal
} from "./utils/generics.js"
import { registry } from "./utils/registry.js"
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

export type bind<$, thisDef> = $ & {
    this: inferDefinition<thisDef, bind<$, thisDef>>
}

type exportsOf<context extends ScopeInferenceContext> = context extends [
    infer exports,
    ...unknown[]
]
    ? exports
    : context

type localsOf<context extends ScopeInferenceContext> = context extends List
    ? context["1"] & (context["2"] extends false ? {} : Ark)
    : Ark

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
    (opts["standard"] extends false ? {} : Ark)

export type alias<def = {}> = nominal<def, "alias">

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

export class Scope<context extends ScopeInferenceContext = any> {
    declare infer: exportsOf<context>

    readonly config: ScopeConfig
    #resolutions: Record<string, Type> = {}
    #exports: Record<string, Type> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = compileScopeOptions(opts)
        if (opts.standard !== false) {
            this.#cacheSpaces([registry().ark], "imports")
        }
        if (opts.imports) {
            this.#cacheSpaces(opts.imports, "imports")
        }
        if (opts.includes) {
            this.#cacheSpaces(opts.includes, "includes")
        }
    }

    type: TypeParser<resolutions<context>> = ((
        def: unknown,
        config: TypeOptions = {}
    ) => {
        return new Type(def, this)
    }) as unknown as TypeParser<resolutions<context>>

    #cacheSpaces(spaces: Space[], kind: "imports" | "includes") {
        for (const space of spaces) {
            for (const name in space) {
                if (name in this.#resolutions || name in this.aliases) {
                    throwParseError(writeDuplicateAliasesMessage(name))
                }
                this.#resolutions[name] = space[name]
                if (kind === "includes") {
                    this.#exports[name] = space[name]
                }
            }
        }
    }

    maybeResolve(name: name<context>): Type | undefined {
        if (this.#resolutions[name]) {
            return this.#resolutions[name]
        }
        const aliasDef = this.aliases[name]
        if (!aliasDef) {
            return
        }
        const resolution = new Type(aliasDef, this)
        this.#resolutions[name] = resolution
        this.#exports[name] = resolution
        return resolution
    }

    #compiled = false
    compile() {
        if (!this.#compiled) {
            for (const name in this.aliases) {
                this.#exports[name] ??= this.maybeResolve(name) as Type
            }
            this.#compiled = true
        }
        return this.#exports as Space<this["infer"]>
    }

    // TODO: shallow cycle?
    // let node = parseDefinition(aliasDef, ctx)
    // if (typeof node === "string") {
    //     if (seen.includes(node)) {
    //         return throwParseError(
    //             writeShallowCycleErrorMessage(name, seen)
    //         )
    //     }
    //     seen.push(node)
    //     node = this.#resolveRecurse(node, "throw", seen).root
    // }
}

export const scope: ScopeParser = ((aliases: Dict, opts: ScopeOptions = {}) =>
    new Scope(aliases, opts)) as any

export const rootScope: Scope<[{}, {}, false]> = scope(
    {},
    { name: "root", standard: false }
) as any

export const rootType: TypeParser<{}> = rootScope.type

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
