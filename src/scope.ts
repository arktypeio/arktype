import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import { registry } from "./nodes/registry.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { type Ark } from "./scopes/ark.js"
import type { KeyCheckKind, TypeConfig, TypeParser } from "./type.js"
import { Type } from "./type.js"
import type { error } from "./utils/errors.js"
import { throwParseError } from "./utils/errors.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { split } from "./utils/lists.js"
import type { Dict } from "./utils/records.js"
import type { stringifyUnion } from "./utils/unionToTuple.js"

type ScopeParser<$> = {
    <aliases>(aliases: validateAliases<aliases, $>): Scope<
        parseScope<aliases, $>
    >

    imports: <imports extends Space[] | []>(
        ...imports: validateImports<imports>
    ) => ScopeParser<mergeSpaces<imports>>
}

// nameFrom<k> extends keyof preresolved<opts>
// ? writeDuplicateAliasesMessage<k & string>
// :

type validateAliases<aliases, $> = evaluate<{
    [k in keyof aliases]: k extends GenericDeclaration
        ? validateDefinition<
              aliases[k],
              bind<
                  bootstrapScope<aliases, $>,
                  {
                      [param in paramsFrom<k>[number]]: unknown
                  }
              >
          >
        : validateDefinition<aliases[k], bootstrapScope<aliases, $>>
}>

type bootstrapScope<aliases, $> = {
    [k in nonGenericNameFrom<keyof aliases>]: aliases[k] extends Space
        ? aliases[k]
        : alias<aliases[k]>
} & {
    [k in genericKey<keyof aliases> as genericNameFrom<k>]: generic<
        paramsFrom<k>,
        aliases[k]
    >
} & $

type parseScope<aliases, $> = evaluate<{
    [k in keyof aliases as nameFrom<k>]: inferDefinition<
        aliases[k],
        bootstrapScope<aliases, $>
    >
}>

export type PrivateAlias<name extends string = string> = `#${name}`

type genericKey<k> = k & GenericDeclaration

type genericNameFrom<k> = k extends GenericDeclaration<infer name>
    ? name
    : never

type nonGenericNameFrom<k> = Exclude<k, GenericDeclaration>

type nameFrom<k> = nonGenericNameFrom<k> | genericNameFrom<k>

export type GenericDeclaration<
    name extends string = string,
    params extends string = string
> = `${name}<${params}>`

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

export type ScopeOptions = {
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

// type validateOptions<opts extends ScopeOptions> = {
//     [k in keyof opts]: k extends "imports"
//         ? mergeSpaces<opts["imports"]> extends error<infer e>
//             ? e
//             : opts[k]
//         : opts[k]
// }

type validateImports<imports extends Space[]> =
    mergeSpaces<imports> extends error<infer e> ? [e] : imports

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

export type subaliasOf<$> = {
    [k in keyof $]: $[k] extends Space<infer exports>
        ? {
              [subalias in keyof exports]: `${k & string}.${subalias & string}`
          }[keyof exports]
        : never
}[keyof $]

export type alias<def = {}> = nominal<def, "alias">

export type Space<exports = Dict> = {
    [k in keyof exports]: exports[k] extends Space
        ? exports[k]
        : Type<exports[k]>
}

// type resolutions<ctx extends ScopeInferenceContext> = localsOf<ctx> &
//     exportsOf<ctx>

// type name<ctx extends ScopeInferenceContext> = keyof resolutions<ctx> & string

export class Scope<$ = any> {
    declare infer: $
    // declare inferIn: extractIn<exportsOf<$>>

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

    type: TypeParser<$> = ((def: unknown, config: TypeConfig = {}) => {
        config
        return new Type(def, this)
    }) as never

    // scope<aliases>(
    //     aliases: validateAliases<aliases, { imports: [Space<exportsOf<$>>] }>
    // ): Scope<parseScope<aliases, { imports: [Space<exportsOf<$>>] }>> {
    //     return new Scope(aliases, { imports: [this.compile()] })
    // }

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

    maybeResolve(name: string): Type | undefined {
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
        return this.exports as Space<$>
    }
}

export const scope: ScopeParser<Ark> = ((
    aliases: Dict,
    opts: ScopeOptions = {}
) => new Scope(aliases, opts)) as any

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
