import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import { inferred } from "./parse/definition.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import type {
    extractIn,
    extractOut,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { Type } from "./type.js"
import { throwParseError } from "./utils/errors.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { split } from "./utils/lists.js"
import type { Dict } from "./utils/records.js"

export type ScopeParser<parent, root> = {
    <aliases>(aliases: validateAliases<aliases, parent & root>): Scope<
        parseScope<aliases, parent & root>,
        parent,
        root
    >
}

type validateAliases<aliases, $> = evaluate<{
    [k in keyof aliases]: k extends GenericDeclaration<infer name>
        ? name extends keyof $
            ? writeDuplicateAliasesMessage<name>
            : validateDefinition<
                  aliases[k],
                  bootstrapScope<aliases, $> & {
                      // TODO: allow whitespace here
                      [param in paramsFrom<k>[number]]: unknown
                  }
              >
        : k extends keyof $
        ? writeDuplicateAliasesMessage<k & string>
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
    [k in keyof aliases as nameFrom<k>]: aliases[k] extends Space
        ? aliases[k]
        : inferDefinition<aliases[k], bootstrapScope<aliases, $>>
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
    root?: Space
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
    : $[name]

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

export class Scope<exports = any, locals = any, root = any> {
    declare infer: extractOut<exports>
    declare inferIn: extractIn<exports>
    declare $: exports & locals & root

    readonly config: ScopeConfig
    private resolutions: Record<string, Type> = {}
    private exports: Record<string, Type> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = compileScopeOptions(opts)

        // this.cacheSpaces(opts.root ?? registry().ark, "imports")
        // if (opts.imports) {
        //     this.cacheSpaces(opts.imports, "imports")
        // }
    }

    type: TypeParser<this["$"]> = ((def: unknown, config: TypeConfig = {}) => {
        return new Type(def, this)
    }) as never

    scope: ScopeParser<exports, root> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, config)
    }) as never

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
        return this.exports as Space<exports>
    }
}

export const RootScope = new Scope<{}, {}, {}>({}, {})

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
