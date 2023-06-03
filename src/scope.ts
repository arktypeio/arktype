import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import { registry } from "./nodes/registry.js"
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

export type ScopeParser<local, ambient> = {
    <aliases>(aliases: validateAliases<aliases, local & ambient>): Scope<
        inferScope<bootstrap<aliases>, local & ambient>,
        local,
        ambient
    >
}

type validateAliases<aliases, $> = evaluate<{
    [k in keyof aliases]: k extends GenericDeclaration<infer name>
        ? name extends keyof $
            ? writeDuplicateAliasesMessage<name>
            : validateDefinition<
                  aliases[k],
                  $ &
                      bootstrap<aliases> & {
                          // TODO: allow whitespace here
                          [param in paramsFrom<k>[number]]: unknown
                      }
              >
        : k extends keyof $
        ? writeDuplicateAliasesMessage<k & string>
        : aliases[k] extends Scope
        ? aliases[k]
        : validateDefinition<aliases[k], $ & bootstrap<aliases>>
}>

// trying to nested def here in an object or tuple cause circularities during some thunk validations
export type Alias<def = {}> = nominal<def, "alias">

export type Generic<
    params extends string[] = string[],
    def = unknown
> = nominal<[params, def], "generic">

type bootstrap<aliases> = {
    [k in nonGenericNameFrom<keyof aliases>]: aliases[k] extends Scope
        ? aliases[k]
        : Alias<aliases[k]>
} & {
    // TODO: do I need to parse the def AST here? or something more so that
    // references can be resolved if it's used outside the scope
    [k in genericKey<keyof aliases> as genericNameFrom<k>]: Generic<
        paramsFrom<k>,
        aliases[k]
    >
}

type inferScope<bootstrapped, $> = evaluate<{
    [name in keyof bootstrapped]: bootstrapped[name] extends Alias<infer def>
        ? inferDefinition<def, $ & bootstrapped>
        : bootstrapped[name] extends Generic
        ? bootstrapped[name]
        : bootstrapped[name] extends Scope
        ? bootstrapped[name]
        : never
}>

type genericKey<k> = k & GenericDeclaration

type genericNameFrom<k> = k extends GenericDeclaration<infer name>
    ? name
    : never

type nonGenericNameFrom<k> = Exclude<k, GenericDeclaration>

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

export type ScopeOptions = {
    ambient?: Scope
    local?: Scope
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type ScopeConfig = {
    readonly keys: KeyCheckKind
    readonly codes: ProblemOptionsByCode
}

export const compileScopeOptions = (opts: ScopeOptions): ScopeConfig => ({
    codes: {},
    keys: opts.keys ?? "loose"
})

export type resolve<
    name extends keyof $ | subaliasOf<$>,
    $
> = name extends `${infer subscope}.${infer name}`
    ? subscope extends keyof $
        ? $[subscope] extends Scope
            ? name extends keyof $[subscope]["infer"]
                ? $[subscope]["infer"][name]
                : never
            : never
        : never
    : isAny<$[name]> extends true
    ? any
    : $[name] extends Alias<infer def>
    ? inferDefinition<def, $>
    : $[name]

export type subaliasOf<$> = {
    [k in keyof $]: $[k] extends Scope<infer exports>
        ? {
              [subalias in keyof exports]: `${k & string}.${subalias & string}`
          }[keyof exports]
        : never
}[keyof $]

export type Space<exports = Dict, $ = Dict> = {
    [k in keyof exports]: exports[k] extends Scope<
        infer exports,
        infer locals,
        infer root
    >
        ? Space<exports, locals & root>
        : Type<exports[k], exports & $>
}

export class Scope<exports = any, locals = any, ambient = any> {
    declare infer: extractOut<exports>
    declare inferIn: extractIn<exports>
    declare $: exports & locals & ambient

    readonly config: ScopeConfig
    readonly ambient: Scope | null
    readonly local: Scope | null
    private resolutions: Record<string, Type | Space>
    private exports: Record<string, Type | Space> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = compileScopeOptions(opts)
        this.ambient =
            opts.ambient === undefined ? registry().ark : opts.ambient
        this.resolutions = { ...this.ambient?.compile() }
        this.local = opts.local ?? null
        if (this.local) {
            const locals = this.local.compile()
            for (const k in locals) {
                if (k in this.resolutions) {
                    throwParseError(writeDuplicateAliasesMessage(k))
                }
                this.resolutions[k] = locals[k]
            }
        }
        for (const k in aliases) {
            if (k in this.resolutions) {
                throwParseError(writeDuplicateAliasesMessage(k))
            }
        }
    }

    type: TypeParser<this["$"]> = ((def: unknown, config: TypeConfig = {}) => {
        return !config || new Type(def, this)
    }) as never

    scope: ScopeParser<exports, ambient> = ((
        aliases: Dict,
        opts: ScopeOptions = {}
    ) => {
        return new Scope(aliases, { ...opts, local: this })
    }) as never

    maybeResolve(name: string): Type | undefined {
        if (this.resolutions[name]) {
            // TODO: Scope resolution
            return this.resolutions[name] as Type
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

    private compiled = false
    compile() {
        if (!this.compiled) {
            for (const name in this.aliases) {
                this.exports[name] ??= this.maybeResolve(name) as Type
            }
            this.compiled = true
        }
        return this.exports as Space<exports, locals & ambient>
    }
}

export const EmptyScope = new Scope<{}, {}, {}>({}, {})

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
