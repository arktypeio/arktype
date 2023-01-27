import type { TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveNode } from "./nodes/resolve.ts"
import type {
    inferDefinition,
    inferred,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Type, TypeParser } from "./type.ts"
import { isType, nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Domain } from "./utils/domains.ts"
import { throwParseError } from "./utils/errors.ts"
import type {
    Dict,
    evaluate,
    extend,
    nominal,
    stringKeyOf
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeParser = <config extends ScopeConfig = {}>(config?: config) =>
    lazyDynamicWrap(
        (aliases: Dict) => new Scope(aliases, config ?? {})
    ) as unknown as ScopeParser<
        mergeScopes<config["imports"]>,
        mergeScopes<config["exports"]>
    >

export const composeTypeParser = <$ extends Scope>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveNode(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    })

type ScopeParser<imports, exports> = LazyDynamicWrap<
    InferredScopeParser<imports, exports>,
    DynamicScopeParser<exports>
>

// [] allows tuple inferences
type ScopeList = [] | readonly Scope[]

// TODO: Reintegrate thunks/compilation? Add utilities for narrowed defs
export type ScopeConfig = {
    imports?: ScopeList
    exports?: ScopeList
}

type InferredScopeParser<imports, exports> = <aliases>(
    aliases: validateScope<aliases, imports, exports>
) => Scope<inferScope<aliases, imports, exports>, imports>

type DynamicScopeParser<exports> = <aliases extends Dict>(
    aliases: aliases
) => Scope<Dict<stringKeyOf<exports> | stringKeyOf<aliases>>>

type mergeScopes<
    scopes extends ScopeList | undefined,
    result = {}
> = scopes extends readonly [Scope<infer head>, ...infer tail extends ScopeList]
    ? keyof head & keyof result extends never
        ? mergeScopes<tail, result & head>
        : `Overlapping keys`
    : result

type validateScope<aliases, imports, exports> = {
    // TODO: check imports/exports relative to each other
    [name in keyof aliases]: name extends stringKeyOf<exports>
        ? writeDuplicateAliasMessage<name>
        : validateDefinition<
              aliases[name],
              inferScope<aliases, imports, exports> & imports
          >
}

type inferScope<definitions, imports, exports> = evaluate<
    {
        [k in keyof definitions]: inferDefinition<
            definitions[k],
            {
                [k in keyof definitions]: BootstrapScope<definitions[k]>
            } & exports &
                imports
        >
    } & exports
>

type ScopeCache = {
    nodes: { [def in string]?: TypeNode }
    types: { [name in string]?: Type }
}

export type Space<root = Dict> = { [k in keyof root]: Type<root[k]> }

type aliasesOf<root = Dict> = { readonly [k in keyof root]: unknown }

export class Scope<exports = any, imports = any> {
    aliases: aliasesOf<exports>
    locals: aliasesOf<exports & imports>

    cache: ScopeCache = {
        nodes: {},
        types: {}
    }

    type: TypeParser<exports & imports>
    extend: ScopeParser<imports, exports>

    constructor(aliases: Dict, public config: ScopeConfig) {
        this.type = composeTypeParser(this as any)
        this.extend = composeScopeParser(this as any) as ScopeParser<
            imports,
            exports
        >
        // TODO: improve the efficiency of this for defaultScope
        if (!config.exports && !config.imports) {
            this.aliases = aliases as aliasesOf<exports>
            this.locals = aliases as aliasesOf<exports & imports>
            return
        }
        const mergedAliases = { ...aliases }
        const mergedLocals = { ...aliases }
        // TODO: improve
        for (const parent of [
            ...(config.imports ?? []),
            ...(config.exports ?? [])
        ]) {
            for (const name in parent.aliases) {
                if (name in mergedAliases) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                mergedLocals[name] = parent.aliases[name]
                if (config.exports?.includes(parent as never)) {
                    mergedAliases[name] = parent.aliases[name]
                    this.cache.types[name] = parent.cache.types[name]
                }
            }
            for (const def in parent.cache.nodes) {
                if (!this.cache.nodes[def]) {
                    this.cache.nodes[def] = parent.cache.nodes
                }
            }
        }
        this.aliases = mergedAliases as aliasesOf<exports>
        this.locals = mergedLocals as aliasesOf<exports & imports>
    }

    get infer(): exports {
        return chainableNoOpProxy
    }

    compile() {
        const types = {} as Space
        for (const name in this.aliases) {
            const def = this.aliases[name]
            types[name] ??=
                typeof def === "function"
                    ? isType(def)
                        ? def
                        : def()
                    : this.type.dynamic(this.aliases[name])
        }
        return types as Space<exports>
    }
}

const always: Record<Domain, true> = {
    bigint: true,
    boolean: true,
    null: true,
    number: true,
    object: true,
    string: true,
    symbol: true,
    undefined: true
}

const emptyScope: ScopeParser<{}, {}> = composeScopeParser()

export const tsKeywords = emptyScope({
    any: ["node", always] as inferred<any>,
    bigint: ["node", { bigint: true }],
    boolean: ["node", { boolean: true }],
    false: ["node", { boolean: { value: false } }],
    never: ["node", {}],
    null: ["node", { null: true }],
    number: ["node", { number: true }],
    object: ["node", { object: true }],
    string: ["node", { string: true }],
    symbol: ["node", { symbol: true }],
    true: ["node", { boolean: { value: true } }],
    unknown: ["node", always] as inferred<unknown>,
    void: ["node", { undefined: true }] as inferred<void>,
    undefined: ["node", { undefined: true }],
    // TODO: Add remaining JS object types
    Function: [
        "node",
        { object: { subdomain: "Function" } }
    ] as inferred<Function>
})

export const validation = emptyScope({
    email: /^(.+)@(.+)\.(.+)$/,
    alphanumeric: /^[dA-Za-z]+$/,
    alpha: /^[A-Za-z]+$/,
    lowercase: /^[a-z]*$/,
    uppercase: /^[A-Z]*$/,
    integer: ["node", { number: { divisor: 1 } }]
})

// This is just copied from the inference of defaultScope. Creating an explicit
// type like this makes validation for the default type and scope functions feel
// significantly more responsive.
type PrecompiledDefaults = {
    email: string
    alphanumeric: string
    alpha: string
    lowercase: string
    uppercase: string
    integer: number
    any: any
    bigint: bigint
    boolean: boolean
    false: false
    never: never
    null: null
    number: number
    object: object
    string: string
    symbol: symbol
    true: true
    unknown: unknown
    void: void
    undefined: undefined
    Function: Function
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ValidateDefaultScope = extend<
    PrecompiledDefaults,
    // if PrecompiledDefaults gets out of sync with defaultScope, there will be a type error here
    typeof tsKeywords["infer"] & typeof validation["infer"]
>

// TODO: change to extend, include => exports/locals?
export const scope: ScopeParser<PrecompiledDefaults, {}> = composeScopeParser({
    imports: [tsKeywords, validation]
})

export const type: TypeParser<PrecompiledDefaults> =
    composeTypeParser(validation)

export type BootstrapScope<$ = {}> = nominal<$, "bootstrap">

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`
