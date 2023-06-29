import type { Dict, evaluate, isAny, nominal } from "../dev/utils/src/main.js"
import {
    domainOf,
    hasDomain,
    isThunk,
    Path,
    throwInternalError,
    throwParseError,
    transform
} from "../dev/utils/src/main.js"
import type { ProblemCode } from "./compile/problems.js"
import type { arkKind } from "./compile/registry.js"
import { addArkKind, hasArkKind } from "./compile/registry.js"
import { CompilationState, InputParameterName } from "./compile/state.js"
import type { TypeNode } from "./main.js"
import { builtins, typeNode } from "./nodes/composite/type.js"
import type {
    CastTo,
    inferDefinition,
    validateDefinition
} from "./parse/definition.js"
import {
    parseObject,
    writeBadDefinitionTypeMessage
} from "./parse/definition.js"
import type {
    GenericDeclaration,
    GenericParamsParseError
} from "./parse/generic.js"
import { parseGenericParams } from "./parse/generic.js"
import {
    writeMissingSubscopeAccessMessage,
    writeNonScopeDotMessage,
    writeUnresolvableMessage
} from "./parse/string/shift/operand/unenclosed.js"
import { parseString } from "./parse/string/string.js"
import type {
    DeclarationParser,
    DefinitionParser,
    extractIn,
    extractOut,
    Generic,
    GenericProps,
    KeyCheckKind,
    TypeConfig,
    TypeParser
} from "./type.js"
import {
    createTypeParser,
    generic,
    Type,
    validateUninstantiatedGeneric
} from "./type.js"

export type ScopeParser<parent, ambient> = {
    <const aliases>(
        aliases: validateAliases<aliases, parent & ambient>
    ): Scope<{
        exports: inferBootstrapped<{
            exports: bootstrapExports<aliases>
            locals: bootstrapLocals<aliases> & parent
            ambient: ambient
        }>
        locals: inferBootstrapped<{
            exports: bootstrapLocals<aliases>
            locals: bootstrapExports<aliases> & parent
            ambient: ambient
        }>
        ambient: ambient
    }>
}

type validateAliases<aliases, $> = {
    [k in keyof aliases]: parseScopeKey<k>["params"] extends []
        ? aliases[k] extends Preparsed
            ? aliases[k]
            : validateDefinition<aliases[k], $ & bootstrap<aliases>, {}>
        : parseScopeKey<k>["params"] extends GenericParamsParseError
        ? // use the full nominal type here to avoid an overlap between the
          // error message and a possible value for the property
          parseScopeKey<k>["params"][0]
        : validateDefinition<
              aliases[k],
              $ & bootstrap<aliases>,
              {
                  // once we support constraints on generic parameters, we'd use
                  // the base type here: https://github.com/arktypeio/arktype/issues/796
                  [param in parseScopeKey<k>["params"][number]]: unknown
              }
          >
}

export type bindThis<def> = { this: Def<def> }

export const bindThis = () => ({
    // TODO: fix
    this: builtins.unknown()
})

/** nominal type for an unparsed definition used during scope bootstrapping */
type Def<def = {}> = nominal<def, "unparsed">

/** sentinel indicating a scope that will be associated with a generic has not yet been parsed */
export type UnparsedScope = "$"

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

type Preparsed = Type | TypeSet | GenericProps

type bootstrapAliases<aliases> = {
    [k in Exclude<
        keyof aliases,
        // avoid inferring nominal symbols, e.g. id from TypeSet
        GenericDeclaration | symbol
    >]: aliases[k] extends Preparsed
        ? aliases[k]
        : aliases[k] extends (() => infer thunkReturn extends Preparsed)
        ? thunkReturn
        : Def<aliases[k]>
} & {
    [k in keyof aliases & GenericDeclaration as extractGenericName<k>]: Generic<
        parseGenericParams<extractGenericParameters<k>>,
        aliases[k],
        UnparsedScope
    >
}

type inferBootstrapped<r extends Resolutions> = evaluate<{
    [k in keyof r["exports"]]: r["exports"][k] extends Def<infer def>
        ? inferDefinition<def, $<r>, {}>
        : r["exports"][k] extends GenericProps<infer params, infer def>
        ? Generic<params, def, $<r>>
        : // otherwise should be a subscope
          r["exports"][k]
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
    ambient?: Scope | null
    codes?: Record<ProblemCode, { mustBe?: string }>
    keys?: KeyCheckKind
}

export type resolve<reference extends keyof $ | keyof args, $, args> = (
    reference extends keyof args ? args[reference] : $[reference & keyof $]
) extends infer resolution
    ? [resolution] extends [never]
        ? never
        : isAny<resolution> extends true
        ? any
        : resolution extends Def<infer def>
        ? inferDefinition<def, $, args>
        : resolution
    : never

type $<r extends Resolutions> = r["exports"] & r["locals"] & r["ambient"]

type exportedName<r extends Resolutions> = keyof r["exports"] & string

export type TypeSet<r extends Resolutions = any> = {
    // just adding the nominal id this way and mapping it is cheaper than an intersection
    [k in exportedName<r> | arkKind]: k extends string
        ? [r["exports"][k]] extends [never]
            ? Type<never, $<r>>
            : isAny<r["exports"][k]> extends true
            ? Type<any, $<r>>
            : r["exports"][k] extends TypeSet | GenericProps
            ? r["exports"][k]
            : Type<r["exports"][k], $<r>>
        : // set the nominal symbol's value to something validation won't care about
          // since the inferred type will be omitted anyways
          CastTo<"typeset">
}

export type Resolutions = {
    exports: unknown
    locals: unknown
    ambient: unknown
}

export type ParseContext = {
    path: Path
    scope: Scope
    args: Record<string, TypeNode> | undefined
}

type MergedResolutions = Record<string, TypeNode | Generic>

export class Scope<r extends Resolutions = any> {
    declare infer: extractOut<r["exports"]>
    declare inferIn: extractIn<r["exports"]>

    config: TypeConfig

    private parseCache: Record<string, TypeNode> = {}
    private resolutions: MergedResolutions

    aliases: Record<string, unknown> = {}
    private exportedNames: exportedName<r>[] = []
    private ambient: Scope | null

    constructor(input: Dict, opts: ScopeOptions) {
        for (const k in input) {
            const parsedKey = parseScopeKey(k)
            this.aliases[parsedKey.name] = parsedKey.params.length
                ? generic(parsedKey.params, input[k], this)
                : input[k]
            if (!parsedKey.isLocal) {
                this.exportedNames.push(parsedKey.name as never)
            }
        }
        this.ambient = opts.ambient ?? null
        if (this.ambient) {
            // ensure exportedResolutions is populated
            this.ambient.export()
            this.resolutions = { ...this.ambient.exportedResolutions! }
        } else {
            this.resolutions = {}
        }
        this.config = opts
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {}) as never
    }

    type: TypeParser<$<r>> = createTypeParser(this as never) as never

    // TODO: decide if this API will be used for non-validated types
    declare: DeclarationParser<$<r>> = () => ({ type: this.type } as never)

    scope: ScopeParser<r["exports"], r["ambient"]> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, {
            ambient: this.ambient,
            ...this.config,
            ...config
        })
    }) as never

    define: DefinitionParser<$<r>> = (def) => def as never

    toAmbient(): Scope<{
        exports: r["exports"]
        locals: r["locals"]
        ambient: r["exports"]
    }> {
        return new Scope(this.aliases, {
            ambient: this,
            ...this.config
        })
    }

    get<name extends keyof r["exports"] & string>(
        name: name
    ): Type<r["exports"][name], $<r>> {
        return this.export()[name] as never
    }

    private createRootContext(args?: Record<string, TypeNode>) {
        return {
            path: new Path(),
            scope: this,
            args
        }
    }

    parseRoot(def: unknown, args?: Record<string, TypeNode>) {
        return this.parse(def, this.createRootContext(args))
    }

    parse(def: unknown, ctx: ParseContext): TypeNode {
        if (typeof def === "string") {
            if (ctx.args !== undefined) {
                // we can only rely on the cache if there are no contextual
                // resolutions like "this" or generic args
                return parseString(def, ctx)
            }
            if (!this.parseCache[def]) {
                this.parseCache[def] = parseString(def, ctx)
            }
            return this.parseCache[def]
        }
        return hasDomain(def, "object")
            ? parseObject(def, ctx)
            : throwParseError(writeBadDefinitionTypeMessage(domainOf(def)))
    }

    maybeResolve(
        name: string,
        ctx: ParseContext
    ): TypeNode | Generic | undefined {
        const cached = this.resolutions[name]
        if (cached) {
            return cached
        }
        let def = this.aliases[name]
        if (!def) {
            const dotIndex = name.indexOf(".")
            if (dotIndex !== -1) {
                const dotPrefix = name.slice(0, dotIndex)
                const prefixDef = this.aliases[dotPrefix]
                if (hasArkKind(prefixDef, "typeset")) {
                    const resolution = prefixDef[name.slice(dotIndex + 1)]?.root
                    if (!resolution) {
                        return throwParseError(writeUnresolvableMessage(name))
                    }
                    this.resolutions[name] = resolution
                    return resolution
                }
                if (prefixDef !== undefined) {
                    return throwParseError(writeNonScopeDotMessage(dotPrefix))
                }
                // if the name includes ".", but the prefix is not an alias, it
                // might be something like a decimal literal, so just fall through to return
            }
            return
        }
        if (isThunk(def) && !hasArkKind(def, "generic")) {
            def = def()
        }
        this.resolutions[name] = typeNode({
            alias: name,
            resolve: () => this.maybeResolveNode(name, ctx)!
        })
        const resolution = hasArkKind(def, "generic")
            ? validateUninstantiatedGeneric(def)
            : hasArkKind(def, "typeset")
            ? throwParseError(writeMissingSubscopeAccessMessage(name))
            : this.parseRoot(def)
        this.resolutions[name] = resolution
        return resolution
    }

    maybeResolveNode(name: string, ctx: ParseContext): TypeNode | undefined {
        const result = this.maybeResolve(name, ctx)
        return hasArkKind(result, "node") ? result : undefined
    }

    compile() {
        let result = ""
        for (const name in this.aliases) {
            const ctx: ParseContext = {
                path: new Path(),
                scope: this,
                args: undefined
            }
            const resolution = this.maybeResolveNode(name, ctx)
            if (!resolution) {
                return throwInternalError(
                    `Unexpectedly failed to resolve '${name}'`
                )
            }
            result += `const $${name} = (${InputParameterName}) => {
                ${resolution.compile(new CompilationState("allows"))}
            }\n`
        }
        if (this.ambient) {
            result += this.ambient.compile()
        }
        return result
    }

    import<names extends exportedName<r>[]>(
        ...names: names
    ): destructuredImportContext<
        r,
        names extends [] ? keyof r["exports"] : names[number]
    > {
        return addArkKind(
            transform(this.export(...names), ([alias, value]) => [
                `#${alias as string}`,
                value
            ]),
            "typeset"
        ) as never
    }

    // TODO: find a way to deduplicate from maybeResolve
    private exportedResolutions: MergedResolutions | undefined
    private exportCache: ExportCache | undefined
    export<names extends exportedName<r>[]>(
        ...names: names
    ): TypeSet<
        names extends [] ? r : destructuredExportContext<r, names[number]>
    > {
        if (!this.exportCache) {
            this.exportCache = {}
            for (const name of this.exportedNames) {
                let def = this.aliases[name]
                if (hasArkKind(def, "generic")) {
                    this.exportCache[name] = def
                    continue
                }
                // TODO: thunk generics?
                // handle generics before invoking thunks, since they use
                // varargs they will incorrectly be considered thunks
                if (isThunk(def)) {
                    def = def()
                }
                if (hasArkKind(def, "typeset")) {
                    this.exportCache[name] = def
                } else {
                    this.exportCache[name] = new Type(
                        this.maybeResolve(name, this.createRootContext()),
                        this
                    )
                }
            }
            this.exportedResolutions = resolutionsOfTypeSet(this.exportCache)
            Object.assign(this.resolutions, this.exportedResolutions)
        }
        const namesToExport = names.length ? names : this.exportedNames
        return addArkKind(
            transform(namesToExport, ([, name]) => [
                name,
                this.exportCache![name]
            ]),
            "typeset"
        )
    }
}

type ExportCache = Record<string, Type | Generic | TypeSet>

const resolutionsOfTypeSet = (typeSet: ExportCache) => {
    const result: MergedResolutions = {}
    for (const k in typeSet) {
        const v = typeSet[k]
        if (hasArkKind(v, "typeset")) {
            const innerResolutions = resolutionsOfTypeSet(v)
            const prefixedResolutions = transform(
                innerResolutions,
                ([innerK, innerV]) => [`${k}.${innerK}`, innerV]
            )
            Object.assign(result, prefixedResolutions)
        } else if (hasArkKind(v, "generic")) {
            result[k] = v
        } else {
            result[k] = v.root
        }
    }
    return result
}

type destructuredExportContext<
    r extends Resolutions,
    name extends exportedName<r>
> = {
    exports: { [k in name]: r["exports"][k] }
    locals: r["locals"] & {
        [k in Exclude<keyof r["exports"], name>]: r["exports"][k]
    }
    ambient: r["ambient"]
}

type destructuredImportContext<
    r extends Resolutions,
    name extends exportedName<r>
> = {
    [k in name as `#${k & string}`]: CastTo<r["exports"][k]>
}

export const writeShallowCycleErrorMessage = (name: string, seen: string[]) =>
    `Alias '${name}' has a shallow resolution cycle: ${[...seen, name].join(
        ":"
    )}`

export const writeDuplicateAliasesMessage = <name extends string>(
    name: name
): writeDuplicateAliasesMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasesMessage<name extends string> =
    `Alias '${name}' is already defined`

export type ParsedScopeKey = {
    isLocal: boolean
    name: string
    params: string[]
}

export const parseScopeKey = (k: string): ParsedScopeKey => {
    const isLocal = k[0] === "#"
    const name = isLocal ? k.slice(1) : k
    const firstParamIndex = k.indexOf("<")
    if (firstParamIndex === -1) {
        return {
            isLocal,
            name,
            params: []
        }
    }
    if (k.at(-1) !== ">") {
        throwParseError(
            `'>' must be the last character of a generic declaration in a scope.`
        )
    }
    return {
        isLocal,
        name: name.slice(0, firstParamIndex),
        params: parseGenericParams(k.slice(firstParamIndex + 1, -1))
    }
}

type parseScopeKey<k> = k extends PrivateDeclaration<infer inner>
    ? parsePossibleGenericDeclaration<inner, true>
    : parsePossibleGenericDeclaration<k, false>

type parsePossibleGenericDeclaration<
    k,
    isLocal extends boolean
> = k extends GenericDeclaration<infer name, infer paramString>
    ? {
          isLocal: isLocal
          name: name
          params: parseGenericParams<paramString>
      }
    : {
          isLocal: isLocal
          name: k
          params: []
      }
