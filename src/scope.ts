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

export type ScopeParser<ctx extends ScopeContext> = {
    <aliases>(
        aliases: validateAliases<aliases, ctx["locals"] & ctx["ambient"]>
    ): Scope<{
        exports: inferScope<bootstrap<aliases>, ctx["locals"] & ctx["ambient"]>
        locals: ctx["exports"]
        ambient: ctx["ambient"]
    }>
}

export type RootScopeParser = <aliases>(
    aliases: validateAliases<aliases, {}>
) => Scope<{
    exports: inferScope<bootstrap<aliases>, {}>
    locals: {}
    ambient: {}
}>

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
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

type InternalScopeOptions = ScopeOptions & { parent?: Scope | null }

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
> = name extends keyof $
    ? isAny<$[name]> extends true
        ? any
        : $[name] extends Alias<infer def>
        ? inferDefinition<def, $>
        : $[name]
    : name extends `${infer subscope}.${infer name}`
    ? subscope extends keyof $
        ? $[subscope] extends Scope
            ? name extends keyof $[subscope]["infer"]
                ? $[subscope]["infer"][name]
                : never
            : never
        : never
    : never

export type subaliasOf<$> = {
    [k in keyof $]: $[k] extends Scope<infer exports>
        ? {
              [subalias in keyof exports]: `${k & string}.${subalias & string}`
          }[keyof exports]
        : never
}[keyof $]

export type Space<ctx extends ScopeContext = ScopeContext> = {
    [k in keyof ctx["exports"]]: ctx["exports"][k] extends Scope<infer subCtx>
        ? Space<subCtx>
        : Type<ctx["exports"][k], resolutions<ctx>>
}

type resolutions<ctx extends ScopeContext> = ctx["exports"] &
    ctx["locals"] &
    ctx["ambient"]

export type ScopeContext = {
    exports: unknown
    locals: unknown
    ambient: unknown
}

export class Scope<ctx extends ScopeContext = any> {
    declare infer: extractOut<ctx["exports"]>
    declare inferIn: extractIn<ctx["exports"]>
    declare $: resolutions<ctx>

    readonly config: ScopeConfig
    readonly root: Scope | null
    readonly parent: Scope | null
    private resolutions: Record<string, Type | Space>
    private exports: Record<string, Type | Space> = {}

    constructor(public aliases: Dict, opts: InternalScopeOptions = {}) {
        this.config = compileScopeOptions(opts)
        this.parent = opts.parent === undefined ? registry().ark : opts.parent
        this.root =
            this.parent === null
                ? null
                : this.parent.root === null
                ? this.parent
                : this.parent.root
        this.resolutions = { ...this.root?.compile() }
        if (this.parent && this.parent !== this.root) {
            const locals = this.parent.compile()
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

    static root: RootScopeParser = (aliases) => {
        return new Scope(aliases, { parent: null })
    }

    type: TypeParser<this["$"]> = ((def: unknown, config: TypeConfig = {}) => {
        config
        return new Type(def, this)
    }) as never

    scope: ScopeParser<ctx> = ((aliases: Dict, opts: ScopeOptions = {}) => {
        return new Scope(aliases, { ...opts, parent: this })
    }) as never

    toAmbient(): Scope<{
        exports: {}
        locals: {}
        ambient: ctx["exports"]
    }> {
        return new Scope({}, { parent: this })
    }

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
                if (!this.exports[name]) {
                    this.maybeResolve(name)
                }
            }
            this.compiled = true
        }
        return this.exports as Space<ctx>
    }
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        "=>"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`
