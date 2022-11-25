import { compile } from "./nodes/compile.js"
import type { Node } from "./nodes/node.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import { fullStringParse, maybeNaiveParse } from "./parse/string.js"
import { Type } from "./type.js"
import type { Config } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { record } from "./utils/dataTypes.js"
import { throwInternalError } from "./utils/errors.js"
import type { evaluate, mutable, stringKeyOf } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawScope = (aliases: record, config: Config = {}) => {
    const root = new ScopeRoot(aliases, config)
    const types: Scope<record> = { $: root as any }
    for (const name in aliases) {
        types[name] = new Type(root.resolve(name), config, types)
    }
    return types
}

export const scope = lazyDynamicWrap(rawScope) as any as LazyDynamicWrap<
    InferredScopeFn,
    DynamicScopeFn
>

let rootScope: Scope<{}> | undefined

export const getRootScope = () => {
    rootScope ??= scope({}) as any
    return rootScope!
}

type InferredScopeFn = <aliases, inferredParent extends record = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: Config<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

type DynamicScopeFn = <aliases extends record>(
    aliases: aliases,
    config?: Config
) => Scope<aliases>

export type Scope<inferred extends record> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

export type DynamicScope = Scope<record>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Type<inferred[name]>
}

export class ScopeRoot<inferred extends record = record> {
    attributes = {} as Record<keyof inferred, Node>
    private cache: mutable<record<Node>> = {}

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: Config<record>
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }

    resolve(name: stringKeyOf<inferred>): Node {
        if (name in this.cache) {
            return this.cache[name]
        }
        if (!(name in this.aliases)) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias '${name}'`
            )
        }
        const root = parseDefinition(this.aliases[name], this)
        this.cache[name] = root
        this.attributes[name] = compile(root, this)
        return root
    }

    memoizedParse(def: string): Node {
        if (def in this.cache) {
            return this.cache[def]
        }
        const root = maybeNaiveParse(def, this) ?? fullStringParse(def, this)
        this.cache[def] = root
        return root
    }
}

type validateAliases<aliases, scope extends record> = evaluate<{
    [name in keyof aliases]: validateDefinition<aliases[name], scope>
}>

type inferAliases<aliases, scope extends record> = evaluate<{
    [name in keyof aliases]: inferDefinition<aliases[name], scope, aliases>
}>

type inferScopeContext<aliases, scope extends record> = inferAliases<
    aliases,
    scope
> &
    scope
