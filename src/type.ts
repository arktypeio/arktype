import type {
    Identifier,
    TraversalNode,
    TypeNode,
    TypeSet
} from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { aliasOf, GlobalScope, Scope } from "./scope.ts"
import { getGlobalScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { isTopType, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getGlobalScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    return createType(node, scope, config)
}

export const createType = (
    root: TypeSet,
    scope: Scope,
    config: Traits<unknown, Scope>
) => {
    const traversal = compileNode(root, scope)
    return Object.assign(
        (data: unknown) => {
            const result = check(data, traversal, scope)
            return result
                ? { data }
                : { problems: new Problems({ path: "", reason: "invalid" }) }
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat: traversal
        }
    ) as any
}

// TODO: allow type to be used as a def
export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = {
    <def>(def: validateDefinition<def, GlobalScope>): InferredTypeResult<
        inferDefinition<def, GlobalScope>,
        def,
        GlobalScope,
        {}
    >

    <
        def,
        s extends Scope = GlobalScope,
        t = inferDefinition<def, s>,
        traits extends Traits<t, s> = Traits<t, s>
    >(
        def: validateDefinition<def, s>,
        traits: { scope?: s } & traits
    ): InferredTypeResult<t, def, s, traits>
}

type InferredTypeResult<
    t,
    def,
    s extends Scope,
    traits extends Traits<t, s>
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, s>
    ? {} extends traits
        ? Type<t>
        : MorphType<t, s, traits>
    : never

export type Traits<t = unknown, s extends Scope = Scope> = {
    in?: {
        [name in Identifier<aliasOf<s>>]?: (
            data: inferDefinition<name, s>,
            // rest args typed as never so they can't be used unless explicitly typed
            ...rest: never[]
        ) => t
    }
    out?: {
        [name in Identifier<aliasOf<s>>]?: (
            data: t,
            ...rest: never[]
        ) => inferDefinition<name, s>
    }
}

type DynamicTypeFn = (
    def: unknown,
    traits?: { scope?: Scope } & Traits<unknown, Scope>
) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<t = unknown, outMorphs = undefined> = xor<
    outMorphs extends undefined
        ? { data: t }
        : {
              data: t
              to: outMorphs
          },
    { problems: Problems }
>

type extractOutMorphs<s extends Scope, traits extends Traits> = {
    [name in keyof traits["out"]]: (target: name) => inferDefinition<name, s>
}[keyof traits["out"]]

export type Checker<t = unknown, outMorphs = undefined> = (
    data: unknown
) => CheckResult<t, outMorphs>

export type TypeMetadata<t = unknown> = {
    infer: t
    root: TypeNode
    flat: TraversalNode
}

export type Type<t = unknown> = Checker<t> & TypeMetadata<t>

export type MorphType<
    t = unknown,
    s extends Scope = Scope,
    traits extends Traits<t, s> = Traits<t, s>
> = Checker<t, extractOutMorphs<s, traits>> & TypeMetadata<t>
