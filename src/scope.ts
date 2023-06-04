import type { ProblemCode, ProblemOptionsByCode } from "./nodes/problems.js"
import type {
    inferDefinition,
    Inferred,
    validateDefinition
} from "./parse/definition.js"
import type {
    extractIn,
    extractOut,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { Type } from "./type.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { split } from "./utils/lists.js"
import type { Dict } from "./utils/records.js"

export type ScopeParser<parent, root> = {
    <aliases>(aliases: validateAliases<aliases, parent & root>): Scope<
        inferExports<
            aliases,
            inferBootstrapped<bootstrap<aliases>, parent & root>
        >,
        inferLocals<
            aliases,
            inferBootstrapped<bootstrap<aliases>, parent & root>,
            parent
        >,
        root
    >
}

type inferExports<aliases, inferred> = evaluate<{
    [k in keyof inferred as `#${k & string}` extends keyof aliases
        ? never
        : k]: inferred[k]
}>

type inferLocals<aliases, inferred, parent> = evaluate<
    parent & {
        [k in keyof inferred as `#${k & string}` extends keyof aliases
            ? k
            : never]: inferred[k]
    }
>

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

export type bindThis<$, def> = $ & { this: Alias<def> }

// trying to nested def here in an object or tuple cause circularities during some thunk validations
type Alias<def = {}> = nominal<def, "alias">

export type Generic<
    params extends string[] = string[],
    def = unknown
> = nominal<[params, def], "generic">

type bootstrap<aliases> = {
    [k in unmodifiedName<keyof aliases>]: aliases[k] extends Scope
        ? aliases[k]
        : Alias<aliases[k]>
} & {
    // TODO: do I need to parse the def AST here? or something more so that
    // references can be resolved if it's used outside the scope
    [k in genericKey<keyof aliases> as genericNameFrom<k>]: Generic<
        paramsFrom<k>,
        aliases[k]
    >
} & {
    [k in privateKey<keyof aliases> as privateNameFrom<k>]: Alias<aliases[k]>
}

type inferBootstrapped<bootstrapped, $> = evaluate<{
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

type unmodifiedName<k> = Exclude<k, GenericDeclaration | PrivateDeclaration>

type privateKey<k> = k & PrivateDeclaration

type privateNameFrom<k> = k extends PrivateDeclaration<infer name>
    ? name
    : never

export type GenericDeclaration<
    name extends string = string,
    params extends string = string
> = `${name}<${params}>`

type PrivateDeclaration<name extends string = string> = `#${name}`

type paramsFrom<scopeKey> = scopeKey extends GenericDeclaration<
    string,
    infer params
>
    ? split<params, ",">
    : []

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

export type Space<
    exports = Dict,
    locals = Dict,
    root = Dict,
    name extends keyof exports = keyof exports
> = {
    [k in name]: exports[k] extends Scope<
        infer exports,
        infer locals,
        infer root
    >
        ? Space<exports, locals & root>
        : Type<exports[k], exports & locals & root>
}

export class Scope<exports = any, locals = any, root = any> {
    declare infer: extractOut<exports>
    declare inferIn: extractIn<exports>
    declare $: exports & locals & root

    readonly config: ScopeConfig
    private resolutions: Record<string, Type | Space> = {}
    private exports: Record<string, Type | Space> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        this.config = compileScopeOptions(opts)

        // this.cacheSpaces(opts.root ?? registry().ark, "imports")
        // if (opts.imports) {
        //     this.cacheSpaces(opts.imports, "imports")
        // }
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {})
    }

    type: TypeParser<this["$"]> = ((def: unknown, config: TypeConfig = {}) => {
        return !config || new Type(def, this)
    }) as never

    scope: ScopeParser<exports, root> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, config)
    }) as never

    import<names extends (keyof exports)[]>(
        ...names: names
    ): {
        [k in names extends [] ? keyof exports : names[number] as `#${k &
            string}`]: Inferred<exports[k]>
    } {
        return {} as any
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

    private exported = false
    export<names extends (keyof exports)[]>(...names: names) {
        if (!this.exported) {
            for (const name in this.aliases) {
                this.exports[name] ??= this.maybeResolve(name) as Type
            }
            this.exported = true
        }
        return this.exports as Space<
            exports,
            locals,
            root,
            names extends [] ? keyof exports : names[number]
        >
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
