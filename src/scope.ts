import type { ProblemCode } from "./nodes/problems.js"
import type {
    inferDefinition,
    Inferred,
    validateDefinition
} from "./parse/definition.js"
import { inferred } from "./parse/definition.js"
import type {
    GenericDeclaration,
    GenericParamsParseError,
    parseGenericParams
} from "./parse/generic.js"
import type {
    DefinitionParser,
    extractIn,
    extractOut,
    Generic,
    GenericProps,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { Type } from "./type.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { Dict } from "./utils/records.js"

export type ScopeParser<parent, ambient> = {
    <aliases>(aliases: validateAliases<aliases, parent & ambient>): Scope<{
        exports: inferBootstrapped<
            bootstrapExports<aliases>,
            // evaluate the intersection between the bootstrapped aliases and
            // parent, but not ambient to avoid expanding the default scope
            evaluate<bootstrap<aliases> & parent> & ambient
        >
        locals: inferBootstrapped<
            bootstrapLocals<aliases>,
            evaluate<bootstrap<aliases> & parent> & ambient
        >
        ambient: ambient
    }>
}

type validateAliases<aliases, $> = {
    [k in keyof aliases]: k extends GenericDeclaration<
        infer name,
        infer paramsDef
    >
        ? name extends keyof $
            ? writeDuplicateAliasesMessage<name>
            : parseGenericParams<paramsDef> extends infer result extends string[]
            ? result extends GenericParamsParseError<infer message>
                ? message
                : validateDefinition<
                      aliases[k],
                      $ &
                          bootstrap<aliases> & {
                              [param in result[number]]: unknown
                          }
                  >
            : never
        : k extends keyof $
        ? writeDuplicateAliasesMessage<k & string>
        : aliases[k] extends Scope
        ? aliases[k]
        : aliases[k] extends Type
        ? aliases[k]
        : validateDefinition<aliases[k], $ & bootstrap<aliases>>
}

export type bindThis<$, def> = $ & { this: d<def> }

/** nominal type for an unparsed definition used during scope bootstrapping.
 *  uses a minimal name ("d") to minimize its footprint in hovers it
 *  occasionally appears in, e.g. snapshotted scopes for generics
 */
type d<def = {}> = nominal<def, "unparsed">

type bootstrap<aliases> = bootstrapLocals<aliases> & bootstrapExports<aliases>

type bootstrapLocals<aliases> = bootstrapAliases<{
    // intersection seems redundant but it is more efficient for TS to avoid
    // mapping all the keys
    [k in keyof aliases &
        PrivateDeclaration as extractPrivateKey<k>]: aliases[k]
}>

type bootstrapExports<aliases> = bootstrapAliases<{
    [k in Exclude<keyof aliases, PrivateDeclaration>]: aliases[k]
}>

type bootstrapAliases<aliases> = {
    [k in Exclude<keyof aliases, GenericDeclaration>]: aliases[k] extends Scope
        ? aliases[k]
        : d<aliases[k]>
} & {
    [k in keyof aliases & GenericDeclaration as extractGenericName<k>]: Generic<
        parseGenericParams<extractGenericParameters<k>>,
        aliases[k]
    >
}

type inferBootstrapped<bootstrapped, $> = evaluate<{
    [name in keyof bootstrapped]: bootstrapped[name] extends d<infer def>
        ? inferDefinition<def, $ & bootstrapped>
        : bootstrapped[name] extends GenericProps<infer params, infer def>
        ? Generic<params, def, $>
        : bootstrapped[name] extends Scope
        ? bootstrapped[name]
        : never
}>

type extractGenericName<k> = k extends GenericDeclaration<infer name>
    ? name
    : never

type extractGenericParameters<k> = k extends GenericDeclaration<
    string,
    infer params
>
    ? params
    : never

type extractPrivateKey<k> = k extends PrivateDeclaration<infer key>
    ? key
    : never

type PrivateDeclaration<key extends string = string> = `#${key}`

export type ScopeOptions = {
    root?: TypeSet
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type resolve<reference extends keyof $, $> = isAny<
    $[reference]
> extends true
    ? any
    : $[reference] extends d<infer def>
    ? // `never` hits this branch even though it really shouldn't, but the result
      // is still correct since inferring never as a definition results in never
      inferDefinition<def, $>
    : $[reference]

type $<r extends Resolutions> = r["exports"] & r["locals"] & r["ambient"]

export type TypeSet<r extends Resolutions = any> = {
    [k in keyof r["exports"]]: r["exports"][k] extends Scope<infer subcontext>
        ? // avoid treating any, never as subscopes
          r["exports"][k] extends null
            ? Type<r["exports"][k], $<r>>
            : TypeSet<subcontext>
        : Type<r["exports"][k], $<r>>
}

export type Resolutions = {
    exports: unknown
    locals: unknown
    ambient: unknown
}

export class Scope<r extends Resolutions = any> {
    declare infer: extractOut<r["exports"]>
    declare inferIn: extractIn<r["exports"]>;
    declare [inferred]: typeof inferred

    config: TypeConfig

    private resolutions: Record<string, Type | TypeSet> = {}
    private exports: Record<string, Type | TypeSet> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        // this.cacheSpaces(opts.root ?? registry().ark, "imports")
        // if (opts.imports) {
        //     this.cacheSpaces(opts.imports, "imports")
        // }
        this.config = {}
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {}) as never
    }

    type: TypeParser<$<r>> = ((def: unknown, config: TypeConfig = {}) => {
        return !config || new Type(def, this)
    }) as never

    scope: ScopeParser<r["exports"], r["ambient"]> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, config)
    }) as never

    define: DefinitionParser<$<r>> = (def) => def as never

    import<names extends (keyof r["exports"])[]>(
        ...names: names
    ): destructuredImportContext<r, names[number]> {
        return {} as never
    }

    ambient(): Scope<{
        exports: r["exports"]
        locals: {}
        ambient: r["exports"]
    }> {
        return {} as never
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
    export<names extends (keyof r["exports"])[]>(...names: names) {
        if (!this.exported) {
            for (const name in this.aliases) {
                this.exports[name] ??= this.maybeResolve(name) as Type
            }
            this.exported = true
        }
        return this.exports as TypeSet<
            names extends [] ? r : destructuredExportContext<r, names[number]>
        >
    }
}

type destructuredExportContext<
    r extends Resolutions,
    name extends keyof r["exports"]
> = {
    exports: { [k in name]: r["exports"][k] }
    locals: r["locals"] & {
        [k in Exclude<keyof r["exports"], name>]: r["exports"][k]
    }
    ambient: r["ambient"]
}

type destructuredImportContext<
    r extends Resolutions,
    name extends keyof r["exports"]
> = {
    [k in name as `#${k & string}`]: Inferred<r["exports"][k]>
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
