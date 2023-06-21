import { domainOf, hasDomain } from "../dev/utils/src/domains.js"
import { throwParseError } from "../dev/utils/src/errors.js"
import type { evaluate, isAny, nominal } from "../dev/utils/src/generics.js"
import { Path } from "../dev/utils/src/lists.js"
import { isThunk } from "../dev/utils/src/main.js"
import type { Dict } from "../dev/utils/src/records.js"
import type { ProblemCode } from "./compile/problems.js"
import { hasArkKind } from "./compile/registry.js"
import type { TypeNode } from "./main.js"
import { builtins } from "./nodes/composite/type.js"
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
    <aliases>(aliases: validateAliases<aliases, parent & ambient>): Scope<{
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
    [k in keyof aliases]: parseScopeKey<k> extends infer result extends ParsedScopeKey
        ? result["params"] extends []
            ? aliases[k] extends Scope | Type | GenericProps
                ? aliases[k]
                : validateDefinition<aliases[k], $ & bootstrap<aliases>, {}>
            : result["params"] extends GenericParamsParseError
            ? // use the full nominal type here to avoid an overlap between the
              // error message and a possible value for the property
              result["params"][0]
            : validateDefinition<
                  aliases[k],
                  $ & bootstrap<aliases>,
                  {
                      // once we support constraints on generic parameters, we'd use
                      // the base type here: https://github.com/arktypeio/arktype/issues/796
                      [param in result["params"][number]]: unknown
                  }
              >
        : never
}

export type bindThis<def> = { this: Def<def> }

export const bindThis = () => ({
    this: builtins.this()
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

type Preparsed = Scope | GenericProps

type bootstrapAliases<aliases> = {
    [k in Exclude<
        keyof aliases,
        GenericDeclaration
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
    ambient?: TypeSet
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
    [k in exportedName<r>]: [r["exports"][k]] extends [never]
        ? Type<never, $<r>>
        : isAny<r["exports"][k]> extends true
        ? Type<any, $<r>>
        : r["exports"][k] extends Scope<infer subresolutions>
        ? TypeSet<subresolutions>
        : r["exports"][k] extends GenericProps
        ? r["exports"][k]
        : Type<r["exports"][k], $<r>>
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

export class Scope<r extends Resolutions = any> {
    declare infer: extractOut<r["exports"]>
    declare inferIn: extractIn<r["exports"]>

    config: TypeConfig

    // for now we only cache string definitions, since objects could possibly be
    // mutated and then re-parsed
    private parseCache: Record<string, TypeNode> = {}
    private resolutions: Record<string, Type | TypeSet | Generic | string>

    aliases: Record<string, unknown> = {}
    private exportedNames: exportedName<r>[] = []
    private ambient: TypeSet

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
        this.ambient = opts.ambient ?? {}
        // TODO: fix, should work with subscope
        this.resolutions = { ...this.ambient } as never
        this.config = opts
    }

    static root: ScopeParser<{}, {}> = (aliases) => {
        return new Scope(aliases, {}) as never
    }

    type: TypeParser<$<r>> = createTypeParser(this as never) as never

    declare: DeclarationParser<$<r>> = () => ({ type: this.type } as never)

    scope: ScopeParser<r["exports"], r["ambient"]> = ((
        aliases: Dict,
        config: TypeConfig = {}
    ) => {
        return new Scope(aliases, {
            ...this.config,
            ...config,
            ambient: this.ambient
        })
    }) as never

    define: DefinitionParser<$<r>> = (def) => def as never

    toAmbient(): Scope<{
        exports: r["exports"]
        locals: r["locals"]
        ambient: r["exports"]
    }> {
        return new Scope(this.aliases, {
            ...this.config,
            ambient: this.export()
        })
    }

    extract<name extends keyof r["exports"] & string>(
        name: name
    ): Type<r["exports"][name], $<r>> {
        return this.export()[name] as never
    }

    parseRoot(def: unknown, args?: Record<string, TypeNode>) {
        return this.parse(def, {
            path: new Path(),
            scope: this,
            args
        })
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
    ): Type | Generic | TypeSet | string | undefined {
        const cached = this.resolutions[name]
        if (cached) {
            return cached
        }
        let def = this.aliases[name]
        if (!def) {
            return
        }
        if (isThunk(def) && !hasArkKind(def, "generic")) {
            def = def()
        }
        this.resolutions[name] = name
        const resolution = hasArkKind(def, "generic")
            ? validateUninstantiatedGeneric(def)
            : // TODO: should we allow scope thunks? Could be cyclic?
            def instanceof Scope
            ? def.export()
            : new Type(this.parseRoot(def, {}), this)
        this.resolutions[name] = resolution
        return resolution
    }

    maybeResolveNode(name: string, ctx: ParseContext): TypeNode | undefined {
        const result = this.maybeResolve(name, ctx)
        return result instanceof Type ? result.root : undefined
    }

    import<names extends exportedName<r>[]>(
        ...names: names
    ): destructuredImportContext<
        r,
        names extends [] ? keyof r["exports"] : names[number]
    > {
        return Object.fromEntries(
            Object.entries(this.export(...names)).map(([name, resolution]) => [
                `#${name}`,
                resolution
            ])
        ) as never
    }

    private hasBeenExported = false
    export<names extends exportedName<r>[]>(
        ...names: names
    ): TypeSet<
        names extends [] ? r : destructuredExportContext<r, names[number]>
    > {
        if (!this.hasBeenExported) {
            const ctx: ParseContext = {
                path: new Path(),
                scope: this,
                args: undefined
            }
            for (const name of this.exportedNames) {
                this.maybeResolve(name, ctx)
            }
            this.hasBeenExported = true
        }
        const namesToExport = names.length ? names : this.exportedNames
        return Object.fromEntries(
            namesToExport.map((name) => [name, this.resolutions[name]])
        ) as never
    }
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
