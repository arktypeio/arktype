import type { TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/resolve.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { parseType, Type, TypeParser } from "./type.ts"
import { isType, nodeToType } from "./type.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import { throwParseError } from "./utils/errors.ts"
import type {
    Dict,
    evaluate,
    isTopType,
    stringKeyOf
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const composeScopeParser = <parent extends Scope>(parent?: parent) =>
    lazyDynamicWrap((aliases: Dict) => {
        if (parent) {
            const merged = { ...parent.aliases }
            for (const name in aliases) {
                if (name in parent.aliases) {
                    throwParseError(buildDuplicateAliasMessage(name))
                }
                merged[name] = aliases[name]
            }
            const $ = new Scope({ ...aliases, ...parent?.aliases })
            $.cache = parent.cache
            return $
        } else {
            return new Scope(aliases)
        }
    }) as unknown as ScopeParser<Scope extends parent ? {} : parent>

export const composeTypeParser = <$ extends Scope>($: $) =>
    lazyDynamicWrap((def, traits = {}) => {
        const root = resolveIfIdentifier(parseDefinition(def, $), $)
        const flat = compileNode(root, $)
        return nodeToType(root, flat, $, traits)
    }) as TypeParser<$>

type ScopeParser<parent> = LazyDynamicWrap<
    InferredScopeParser<parent>,
    DynamicScopeParser<parent>
>

type InferredScopeParser<parent> = <defs>(
    defs: validateScope<defs, parent>
) => Scope<parseScope<parent & defs>>

type DynamicScopeParser<parent> = <defs extends Dict>(
    defs: defs
) => Scope<Types<stringKeyOf<parent & defs>>>

export type Types<name extends string = string> = { [k in name]: Type }

type ScopeCache = {
    nodes: { [def in string]: TypeNode }
    types: { [name in string]: Type }
}

export class Scope<types = Types> {
    cache: ScopeCache = {
        nodes: {},
        types: {}
    }

    // alias for this used to avoid TS errors when passed to a function
    private $: Scope<Types>
    type: TypeParser<types>
    extend: ScopeParser<types>

    constructor(public aliases: { readonly [k in keyof types]: unknown }) {
        this.$ = this as unknown as Scope
        this.type = composeTypeParser(this.$)
        this.extend = composeScopeParser(this.$) as ScopeParser<types>
    }

    get infer(): inferScope<types> {
        return chainableNoOpProxy
    }

    compile() {
        const types = {} as Types
        for (const name in this.aliases) {
            const def = this.aliases[name]
            types[name] ??=
                typeof def === "function"
                    ? isType(def)
                        ? def
                        : def()
                    : this.type.dynamic(this.aliases[name])
        }
        return types as types
    }
}

type parseScope<aliases> = evaluate<{
    [k in keyof aliases]: isTopType<aliases[k]> extends true
        ? Type
        : aliases[k] extends Type
        ? aliases[k]
        : aliases[k] extends (() => infer r extends Type)
        ? r
        : parseType<aliases[k], aliases, {}>
}>

type validateScope<aliases, parent> = {
    // somehow using "any" as the thunk return type does not cause a circular
    // reference error (every other type does)
    [name in keyof aliases]: name extends stringKeyOf<parent>
        ? buildDuplicateAliasMessage<name>
        : aliases[name] extends () => any
        ? aliases[name]
        : validateDefinition<aliases[name], parent & aliases>
}

type inferScope<types> = {
    [k in keyof types]: types[k] extends { infer: infer data } ? data : never
}

// TODO: test perf diff between Type/infer
export type inferResolution<resolution, $> = resolution extends () => {
    infer: infer data
}
    ? data
    : resolution extends { infer: infer data }
    ? data
    : inferDefinition<resolution, $>

export const scope: ScopeParser<{}> = composeScopeParser()

const rootScope = composeScopeParser()({})

export const type: TypeParser<{}> = composeTypeParser(rootScope)

export const buildDuplicateAliasMessage = <name extends string>(
    name: name
): buildDuplicateAliasMessage<name> => `Alias '${name}' is already defined.`

type buildDuplicateAliasMessage<name extends string> =
    `Alias '${name}' is already defined.`
