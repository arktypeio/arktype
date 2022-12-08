import { keywords } from "./nodes/names.js"
import type { ConstraintsOf, Node } from "./nodes/node.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import { fullStringParse, maybeNaiveParse } from "./parse/string.js"
import { Type } from "./type.js"
import type { Config } from "./type.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import { throwInternalError, throwParseError } from "./utils/errors.js"
import { deepFreeze } from "./utils/freeze.js"
import type {
    Dictionary,
    evaluate,
    mutable,
    stringKeyOf
} from "./utils/generics.js"
import { isKeyOf } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import type { TypeName } from "./utils/typeOf.js"

const rawScope = (aliases: Dictionary, config: Config = {}) => {
    const root = new ScopeRoot(aliases, config)
    const types: Scope<Dictionary> = { $: root as any }
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

type InferredScopeFn = <aliases, inferredParent extends Dictionary = {}>(
    aliases: validateAliases<
        aliases,
        inferScopeContext<aliases, inferredParent>
    >,
    config?: Config<inferredParent>
) => Scope<inferAliases<aliases, inferredParent>>

type DynamicScopeFn = <aliases extends Dictionary>(
    aliases: aliases,
    config?: Config
) => Scope<{ [name in keyof aliases]: unknown }>

export type Scope<inferred extends Dictionary> = {
    $: ScopeRoot<inferred>
} & inferredScopeToArktypes<inferred>

export type DynamicScope = Scope<Dictionary>

type inferredScopeToArktypes<inferred> = {
    [name in keyof inferred]: Type<inferred[name]>
}

export class ScopeRoot<inferred extends Dictionary = Dictionary> {
    attributes = {} as { [k in keyof inferred]: Node }
    // TODO: Add intersection cache
    private cache: mutable<Dictionary<Node>> = {}

    constructor(
        public aliases: Record<keyof inferred, unknown>,
        public config: Config<Dictionary>
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

    resolve(name: string): Node {
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
        const root = parseDefinition(this.aliases[name], this)
        this.attributes[name as stringKeyOf<inferred>] = deepFreeze(root)
        this.cache[name] = root
        return root
    }

    resolveToType<typeName extends TypeName>(
        name: string,
        typeName: typeName,
        seen: string[] = []
    ) {
        let resolution = this.resolve(name)[typeName] as ConstraintsOf<typeName>
        if (resolution === undefined) {
            return throwInternalError(
                `Expected '${name}' to have a definition including '${typeName}'`
            )
        }
        while (typeof resolution === "string") {
            if (seen.includes(resolution)) {
                return throwParseError(
                    `Alias '${name}' has a shallow resolution cycle: ${seen.join(
                        "=>"
                    )}`
                )
            }
            seen.push(resolution)
            resolution = this.resolveToType(resolution, typeName, seen)
        }
        return resolution as ConstraintsOf<typeName, "shallow">
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

type validateAliases<aliases, scope extends Dictionary> = evaluate<{
    [name in keyof aliases]: validateDefinition<aliases[name], scope>
}>

type inferAliases<aliases, scope extends Dictionary> = evaluate<{
    [name in keyof aliases]: inferDefinition<aliases[name], scope, aliases>
}>

type inferScopeContext<aliases, scope extends Dictionary> = inferAliases<
    aliases,
    scope
> &
    scope
