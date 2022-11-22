import type { Type } from "./attributes/attributes.js"
import { compile } from "./attributes/compile.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import { fullStringParse, maybeNaiveParse } from "./parse/string.js"
import type { Config } from "./type.js"
import { ArkType } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import { deepClone } from "./utils/deepClone.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import { throwInternalError } from "./utils/errors.js"
import type { evaluate, stringKeyOf } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawScope = (aliases: dictionary, config: Config = {}) => {
    const root = new ScopeRoot(aliases, config)
    const types: Scope<dictionary> = { $: root as any }
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

type InferredScopeFn = <aliases, inferredParent extends dictionary = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: Config<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

type DynamicScopeFn = <aliases extends dictionary>(
    aliases: aliases,
    config?: Config
) => Scope<aliases>

export type Scope<inferred extends dictionary> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

export type DynamicScope = Scope<dictionary>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Type<inferred[name]>
}

export class ScopeRoot<inferred extends dictionary = dictionary> {
    attributes = {} as Record<keyof inferred, Type>
    private cache: dictionary<Type> = {}

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: Config<dictionary>
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }

    resolve(name: stringKeyOf<inferred>): Type {
        if (name in this.cache) {
            return deepClone(this.cache[name])
        }
        if (!(name in this.aliases)) {
            return throwInternalError(
                `Unexpectedly failed to resolve alias '${name}'`
            )
        }
        this.cache[name] = parseDefinition(this.aliases[name], this)
        this.attributes[name] = compile(this.cache[name], this)
        return deepClone(this.cache[name])
    }

    memoizedParse(def: string): Type {
        if (def in this.cache) {
            return deepClone(this.cache[def])
        }
        this.cache[def] =
            maybeNaiveParse(def, this) ?? fullStringParse(def, this)
        return deepClone(this.cache[def])
    }
}

type validateAliases<aliases, scope extends dictionary> = evaluate<{
    [name in keyof aliases]: validateDefinition<aliases[name], scope>
}>

type inferAliases<aliases, scope extends dictionary> = evaluate<{
    [name in keyof aliases]: inferDefinition<aliases[name], scope, aliases>
}>

type inferScopeContext<aliases, scope extends dictionary> = inferAliases<
    aliases,
    scope
> &
    scope
