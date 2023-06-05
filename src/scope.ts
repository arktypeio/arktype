import type { ProblemCode } from "./nodes/problems.js"
import type {
    inferDefinition,
    Inferred,
    validateDefinition
} from "./parse/definition.js"
import { inferred } from "./parse/definition.js"
import type { writeUnexpectedCharacterMessage } from "./parse/string/shift/operator/operator.js"
import type { Scanner } from "./parse/string/shift/scanner.js"
import type {
    DefinitionParser,
    extractIn,
    extractOut,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import { Type } from "./type.js"
import type { error } from "./utils/errors.js"
import type { evaluate, isAny, nominal } from "./utils/generics.js"
import type { Dict } from "./utils/records.js"

export type ScopeParser<parent, ambient> = {
    <aliases>(aliases: validateAliases<aliases, parent & ambient>): Scope<{
        exports: inferBootstrapped<
            bootstrapExports<aliases>,
            bootstrap<aliases> & parent & ambient
        >
        locals: inferBootstrapped<
            bootstrapLocals<aliases>,
            bootstrap<aliases> & parent & ambient
        >
        ambient: ambient
    }>
}

type validateAliases<aliases, $> = evaluate<{
    [k in keyof aliases]: k extends GenericDeclaration<
        infer name,
        infer paramsDef
    >
        ? name extends keyof $
            ? writeDuplicateAliasesMessage<name>
            : parseGenericParams<paramsDef> extends infer result
            ? result extends string[]
                ? validateDefinition<
                      aliases[k],
                      $ &
                          bootstrap<aliases> & {
                              [param in result[number]]: unknown
                          }
                  >
                : // propagate error
                  result
            : never
        : k extends keyof $
        ? writeDuplicateAliasesMessage<k & string>
        : aliases[k] extends Scope
        ? aliases[k]
        : aliases[k] extends Type
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
        : Alias<aliases[k]>
} & {
    // TODO: do I need to parse the def AST here? or something more so that
    // references can be resolved if it's used outside the scope
    [k in keyof aliases &
        GenericDeclaration as extractGenericName<k>]: parseGenericParams<k> extends infer params extends string[]
        ? Generic<params, aliases[k]>
        : never
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

type extractGenericName<k> = k extends GenericDeclaration<infer name>
    ? name
    : never

type extractPrivateKey<k> = k extends PrivateDeclaration<infer key>
    ? key
    : never

export type GenericDeclaration<
    name extends string = string,
    params extends string = string
> = `${name}<${params}>`

type PrivateDeclaration<key extends string = string> = `#${key}`

type parseGenericParams<def extends string> = parseParamsRecurse<
    def,
    "",
    []
> extends infer result
    ? result extends string[]
        ? "" extends result[number]
            ? error<`An empty string is not a valid generic parameter name`>
            : result
        : // propagate error
          result
    : never

type parseParamsRecurse<
    unscanned extends string,
    param extends string,
    result extends string[]
> = unscanned extends `${infer lookahead}${infer nextUnscanned}`
    ? lookahead extends ","
        ? parseParamsRecurse<nextUnscanned, "", [...result, param]>
        : lookahead extends Scanner.WhiteSpaceToken
        ? param extends ""
            ? // if the next char is whitespace and we aren't in the middle of a param, skip to the next one
              parseParamsRecurse<
                  Scanner.skipWhitespace<nextUnscanned>,
                  "",
                  result
              >
            : Scanner.skipWhitespace<nextUnscanned> extends `${infer nextNonWhitespace}${infer rest}`
            ? nextNonWhitespace extends ","
                ? parseParamsRecurse<rest, "", [...result, param]>
                : error<writeUnexpectedCharacterMessage<nextNonWhitespace, ",">>
            : // params end with a single whitespace character, add the current token
              [...result, param]
        : parseParamsRecurse<nextUnscanned, `${param}${lookahead}`, result>
    : param extends ""
    ? result
    : [...result, param]

export type ScopeOptions = {
    root?: TypeSet
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type resolve<reference extends keyof $, $> = isAny<
    $[reference]
> extends true
    ? any
    : $[reference] extends Alias<infer def>
    ? // never hits this branch even though it really shouldn't, but the result
      // is still correct since inferring never as a definition results in never
      inferDefinition<def, $>
    : $[reference]

export type resolutionsOf<c extends ScopeContext> = c["exports"] &
    c["locals"] &
    c["ambient"]

export type TypeSet<c extends ScopeContext = any> = {
    [k in keyof c["exports"]]: [c["exports"][k]] extends [
        Scope<infer subcontext>
    ]
        ? // avoid treating types inferred as any or never as subscopes
          c["exports"][k] extends never
            ? Type<never, resolutionsOf<c>>
            : isAny<c["exports"][k]> extends true
            ? Type<any, resolutionsOf<c>>
            : TypeSet<subcontext>
        : Type<c["exports"][k], resolutionsOf<c>>
}

export type ScopeContext = {
    exports: unknown
    locals: unknown
    ambient: unknown
}

export class Scope<c extends ScopeContext = any> {
    declare infer: extractOut<c["exports"]>
    declare inferIn: extractIn<c["exports"]>;
    declare [inferred]: typeof inferred

    private resolutions: Record<string, Type | TypeSet> = {}
    private exports: Record<string, Type | TypeSet> = {}

    constructor(public aliases: Dict, opts: ScopeOptions = {}) {
        // this.cacheSpaces(opts.root ?? registry().ark, "imports")
        // if (opts.imports) {
        //     this.cacheSpaces(opts.imports, "imports")
        // }
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {})
    }

    type: TypeParser<resolutionsOf<c>> = ((
        def: unknown,
        config: TypeConfig = {}
    ) => {
        return !config || new Type(def, this)
    }) as never

    scope: ScopeParser<c["exports"], c["ambient"]> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, config)
    }) as never

    define: DefinitionParser<resolutionsOf<c>> = (def) => def as never

    import<names extends (keyof c["exports"])[]>(
        ...names: names
    ): destructuredImportContext<c, names[number]> {
        return {} as never
    }

    ambient(): Scope<{
        exports: c["exports"]
        locals: {}
        ambient: c["exports"]
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
    export<names extends (keyof c["exports"])[]>(...names: names) {
        if (!this.exported) {
            for (const name in this.aliases) {
                this.exports[name] ??= this.maybeResolve(name) as Type
            }
            this.exported = true
        }
        return this.exports as TypeSet<
            names extends [] ? c : destructuredExportContext<c, names[number]>
        >
    }
}

type destructuredExportContext<
    c extends ScopeContext,
    name extends keyof c["exports"]
> = {
    exports: { [k in name]: c["exports"][k] }
    locals: c["locals"] & {
        [k in Exclude<keyof c["exports"], name>]: c["exports"][k]
    }
    ambient: c["ambient"]
}

type destructuredImportContext<
    c extends ScopeContext,
    name extends keyof c["exports"]
> = {
    [k in name as `#${k & string}`]: Inferred<c["exports"][k]>
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
