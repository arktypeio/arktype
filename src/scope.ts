import { keywords } from "./nodes/names.js"
import type { NameNode, Node, ResolutionNode } from "./nodes/node.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import { fullStringParse, maybeNaiveParse } from "./parse/string.js"
import { Type } from "./type.js"
import type { Config } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import { throwInternalError, throwParseError } from "./utils/errors.js"
import { deepFreeze } from "./utils/freeze.js"
import type { evaluate, mutable, stringKeyOf } from "./utils/generics.js"
import { isKeyOf } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import type { dict } from "./utils/typeOf.js"

const rawScope = (aliases: dict, config: Config = {}) => {
    const root = new ScopeRoot(aliases, config)
    const types: Scope<dict> = { $: root as any }
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

export type RootScope = ScopeRoot<{}>

export const getRootScope = () => {
    rootScope ??= scope({}) as any
    return rootScope!
}

type InferredScopeFn = <aliases, inferredParent extends dict = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: Config<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

type DynamicScopeFn = <aliases extends dict>(
    aliases: aliases,
    config?: Config
) => Scope<{ [name in keyof aliases]: unknown }>

export type Scope<inferred extends dict> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

export type DynamicScope = Scope<dict>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Type<inferred[name]>
}

export class ScopeRoot<inferred extends dict = dict> {
    // TODO: Add inferred as resolution generic in type only
    attributes = {} as { [k in keyof inferred]: ResolutionNode }
    // TODO: Add intersection cache
    private cache: mutable<dict<Node>> = {}

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: Config<dict>
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }

    isResolvable(name: string) {
        return isKeyOf(name, keywords) ||
            this.aliases[name] ||
            this.config.scope?.$.attributes[name]
            ? true
            : false
    }

    resolve(name: NameNode, seen: string[] = []): ResolutionNode {
        if (isKeyOf(name, keywords)) {
            return keywords[name] as any
        }
        if (isKeyOf(name, this.attributes)) {
            return this.attributes[name]
        }
        if (!this.aliases[name]) {
            return (
                this.config.scope?.$.attributes[name] ??
                throwInternalError(
                    `Unexpectedly failed to resolve alias '${name}'`
                )
            )
        }
        if (seen.includes(name)) {
            return throwParseError(
                `Alias '${name}' has a shallow resolution cycle: ${seen.join(
                    "=>"
                )}`
            )
        }
        let root = parseDefinition(this.aliases[name], this)
        if (typeof root === "string") {
            seen.push(name)
            root = this.resolve(root, seen)
        }
        this.attributes[name as stringKeyOf<inferred>] = deepFreeze(root)
        this.cache[name] = root
        return root
    }

    memoizedParse(def: string): Node {
        if (def in this.cache) {
            return this.cache[def]
        }
        const root = maybeNaiveParse(def, this) ?? fullStringParse(def, this)
        this.cache[def] = deepFreeze(root)
        return root
    }
}

type validateAliases<aliases, scope extends dict> = evaluate<{
    [name in keyof aliases]: validateDefinition<aliases[name], scope>
}>

type inferAliases<aliases, scope extends dict> = evaluate<{
    [name in keyof aliases]: inferDefinition<aliases[name], scope, aliases>
}>

type inferScopeContext<aliases, scope extends dict> = inferAliases<
    aliases,
    scope
> &
    scope
