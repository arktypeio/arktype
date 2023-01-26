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
    mutable,
    nominal,
    stringKeyOf
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeParser = <imports extends Scope[], exports extends Scope[]>(
    opts?: ScopeOptions<imports, exports>
) =>
    lazyDynamicWrap(
        (aliases: Dict) => new Scope(aliases, opts ?? {})
    ) as unknown as ScopeParser<mergeScopes<imports>, mergeScopes<exports>>

export const composeTypeParser = <$ extends Scope<any>>($: $): TypeParser<$> =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveNode(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    })

type ScopeParser<imports, exports> = LazyDynamicWrap<
    InferredScopeParser<imports, exports>,
    DynamicScopeParser<exports>
>

// TODO: integrate scope imports/exports Maybe reintegrate thunks/compilation?
// Could still be useful for narrowed defs in scope, would make types cleaner
// for actually being able to assign scopes. test.
export type ScopeOptions<imports extends Scope[], exports extends Scope[]> = {
    imports?: imports
    exports?: exports
}

type InferredScopeParser<imports, exports> = <aliases>(
    aliases: validateScope<aliases, imports, exports>
) => Scope<inferScope<aliases, imports, exports>>

type mergeScopes<scopes extends Scope[], result = {}> = scopes extends [
    Scope<infer head>,
    ...infer tail extends Scope[]
]
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
              inferScope<aliases, imports, exports>
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

type DynamicScopeParser<exports> = <aliases extends Dict>(
    aliases: aliases
) => Scope<Dict<stringKeyOf<exports> | stringKeyOf<aliases>>>

type ScopeCache = {
    nodes: { [def in string]?: TypeNode }
    types: { [name in string]?: Type }
}

export type Space<root = Dict> = { [k in keyof root]: Type<root[k]> }

type aliasesOf<root = Dict> = { readonly [k in keyof root]: unknown }

export class Scope<exports = Dict, imports = {}> {
    aliases: aliasesOf<exports>

    cache: ScopeCache = {
        nodes: {},
        types: {}
    }

    type: TypeParser<exports>
    extend: ScopeParser<imports, exports>

    constructor(aliases: Dict, public config: ScopeOptions) {
        this.type = composeTypeParser(this as any)
        this.extend = composeScopeParser(this as any) as ScopeParser<
            imports,
            exports
        >
        if (!config.exports) {
            this.aliases = aliases as aliasesOf<exports>
            return
        }
        const mergedAliases = { ...aliases }
        for (const parent of config.exports) {
            for (const name in parent.aliases) {
                if (name in mergedAliases) {
                    throwParseError(writeDuplicateAliasMessage(name))
                }
                mergedAliases[name] = aliases[name]
                this.cache.types[name] = parent.cache.types[name]
            }
            for (const def in parent.cache.nodes) {
                if (!this.cache.nodes[def]) {
                    this.cache.nodes[def] = parent.cache.nodes
                }
            }
        }
        this.aliases = mergedAliases as aliasesOf<exports>
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

export const tsKeywords = composeScopeParser()({
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

export const defaultScope = tsKeywords.extend({
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
    typeof defaultScope["infer"]
>

export const scope: ScopeParser<PrecompiledDefaults> =
    composeScopeParser(defaultScope)

export const type: TypeParser<PrecompiledDefaults> = composeTypeParser(
    defaultScope.$
)

export type BootstrapScope<$ = {}> = nominal<$, "bootstrap">

export const writeDuplicateAliasMessage = <name extends string>(
    name: name
): writeDuplicateAliasMessage<name> => `Alias '${name}' is already defined`

type writeDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined`
