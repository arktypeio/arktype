import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import { registry } from "./nodes/registry.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { type Ark } from "./scopes/ark.js"
import type {
    extractIn,
    extractOut,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { Type } from "./type.js"
import type { error } from "./utils/errors.js"
import { throwParseError } from "./utils/errors.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { List, split } from "./utils/lists.js"
import type { Dict } from "./utils/records.js"
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

export type GenericDeclaration<
    name extends string = string,
    params extends string = string
> = `${name}<${params}>`

type nameFrom<scopeKey> = scopeKey extends GenericDeclaration<infer name>
    ? name
    : scopeKey

type paramsFrom<scopeKey> = scopeKey extends GenericDeclaration<
    string,
    infer params
>
    ? split<params, ",">
    : []

export type generic<
    params extends string[] = string[],
    def = unknown
> = nominal<[params, def], "generic">

type validateAliases<aliases, opts extends ScopeOptions> = evaluate<{
    [k in keyof aliases]: nameFrom<k> extends keyof preresolved<opts>
        ? writeDuplicateAliasesMessage<k & string>
        : aliases[k] extends Space
        ? aliases[k]
        : validateDefinition<
              aliases[k],
              bind<
                  bootstrapScope<aliases, opts>,
                  {
                      [param in paramsFrom<k>[number]]: unknown
                  }
              >
          >
}>

export type ScopeOptions = {
    // [] allows narrowed tuple inference
    imports?: Space[] | []
    standard?: boolean
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
    [k in keyof opts]: k extends "imports"
        ? mergeSpaces<opts["imports"]> extends error<infer e>
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

type importsOf<opts extends ScopeOptions> = opts["imports"] extends Space[]
    ? mergeSpaces<opts["imports"]>
    : {}

export type resolve<
    name extends keyof $ | subaliasOf<$>,
    $
> = name extends `${infer subscope}.${infer name}`
    ? subscope extends keyof $
        ? $[subscope] extends Space<{ [k in name]: infer t }>
            ? t
            : never
        : never
    : isAny<$[name]> extends true
    ? any
    : $[name] extends alias<infer def>
    ? inferDefinition<def, $>
    : // : $[name] extends generic<infer def, infer params>
      // ? inferDefinition<def, >
      $[name]

export type bind<$, names> = $ & { [k in keyof names]: alias<names[k]> }

type exportsOf<ctx extends ScopeInferenceContext> = ctx extends [
    infer exports,
    ...unknown[]
]
    ? exports
    : ctx

type localsOf<ctx extends ScopeInferenceContext> = ctx extends List
    ? ctx["1"] & (ctx["2"] extends false ? {} : Ark)
    : Ark

export type subaliasOf<$> = {
    [k in keyof $]: $[k] extends Space<infer exports>
        ? {
              [subalias in keyof exports]: `${k & string}.${subalias & string}`
          }[keyof exports]
        : never
}[keyof $]

type mergeSpaces<spaces, base extends Dict = {}> = spaces extends readonly [
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

type preresolved<opts extends ScopeOptions> = importsOf<opts> &
    (opts["standard"] extends false ? {} : Ark)

export type alias<def = {}> = nominal<def, "alias">

type bootstrapScope<aliases, opts extends ScopeOptions> = {
    [k in keyof aliases as nameFrom<k>]: k extends nameFrom<k>
        ? aliases[k] extends Space
            ? aliases[k]
            : alias<aliases[k]>
        : generic<paramsFrom<k>, aliases[k]>
} & preresolved<opts>

type inferExports<aliases, opts extends ScopeOptions> = evaluate<{
    [k in keyof aliases]: aliases[k] extends Space
        ? aliases[k]
        : inferDefinition<aliases[k], bootstrapScope<aliases, opts>>
}>

export type Space<exports = Dict> = {
    [k in keyof exports]: exports[k] extends Space
        ? exports[k]
        : Type<exports[k]>
}

type resolutions<ctx extends ScopeInferenceContext> = localsOf<ctx> &
    exportsOf<ctx>

type name<ctx extends ScopeInferenceContext> = keyof resolutions<ctx> & string

export class Scope<context extends ScopeInferenceContext = any> {
    declare infer: extractOut<exportsOf<context>>
    declare inferIn: extractIn<exportsOf<context>>

    readonly config: ScopeConfig
    private resolutions: Record<string, Type> = {}
    private exports: Record<string, Type> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = compileScopeOptions(opts)
        if (opts.standard !== false) {
            this.cacheSpaces([registry().ark], "imports")
        }
        if (opts.imports) {
            this.cacheSpaces(opts.imports, "imports")
        }
    }

    type: TypeParser<resolutions<context>> = ((
        def: unknown,
        config: TypeConfig = {}
    ) => {
        config
        return new Type(def, this)
    }) as never

    scope<aliases>(
        aliases: validateAliases<
            aliases,
            { imports: [Space<exportsOf<context>>] }
        >
    ): Scope<parseScope<aliases, { imports: [Space<exportsOf<context>>] }>> {
        return new Scope(aliases, { imports: [this.compile()] })
    }

    private cacheSpaces(spaces: Space[], kind: "imports" | "extends") {
        for (const space of spaces) {
            for (const name in space) {
                if (name in this.resolutions || name in this.aliases) {
                    throwParseError(writeDuplicateAliasesMessage(name))
                }
                this.resolutions[name] = space[name]
                if (kind === "extends") {
                    this.exports[name] = space[name]
                }
            }
        }
    }

    maybeResolve(name: name<context>): Type | undefined {
        if (this.resolutions[name]) {
            return this.resolutions[name]
        }
        const aliasDef = this.aliases[name]
        if (!aliasDef) {
            return
        }
        const resolution = new Type(aliasDef, this)
        this.resolutions[name] = resolution
        this.exports[name] = resolution
        return resolution
    }

    private _compiled = false
    compile() {
        if (!this._compiled) {
            for (const name in this.aliases) {
                this.exports[name] ??= this.maybeResolve(name) as Type
            }
            this._compiled = true
        }
        return this.exports as Space<exportsOf<context>>
    }
}

export const scope: ScopeParser = ((aliases: Dict, opts: ScopeOptions = {}) =>
    new Scope(aliases, opts)) as any

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
