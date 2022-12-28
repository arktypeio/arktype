import type { TraversalNode, TypeNode, TypeSet } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type {
    inferDefinition,
    inferRoot,
    validateDefinition,
    validateRoot
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Sources, Targets, Traits } from "./parse/tuple/traits.ts"
import type { GlobalScope, Scope } from "./scope.ts"
import { getGlobalScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { extend, isTopType, nominal, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getGlobalScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    return nodeToType(node, scope, config)
}

export const nodeToType = (
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

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = {
    <def>(def: validateRoot<def, GlobalScope>): InferredTypeResult<
        inferRoot<def, GlobalScope>,
        def,
        {
            scope: GlobalScope
        }
    >

    <
        def,
        s extends Scope = GlobalScope,
        t = inferRoot<def, s>,
        traits extends Traits<t, s> = {
            in?: {}
            out?: {}
        }
    >(
        def: validateRoot<def, s>,
        traits: { scope?: s } & traits
    ): InferredTypeResult<t, def, { scope: s } & traits>
}

type InferredTypeResult<
    t,
    def,
    c extends TypeContext
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, c["scope"]>
    ? c["in"] | c["out"] extends undefined
        ? Type<t>
        : Type<TypeInput<t, c>>
    : never

type DynamicTypeFn = (
    def: unknown,
    traits?: { scope?: Scope } & Traits<unknown, Scope>
) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<
    t = unknown,
    outMorphs = undefined
> = (outMorphs extends undefined
    ? {}
    : {
          to: outMorphs
      }) &
    xor<{ data: t }, { problems: Problems }>

type extractOutMorphs<c extends TypeContext> = {
    [name in keyof c["out"]]: (
        target: name
    ) => CheckResult<inferDefinition<name, c["scope"]>, c["scope"]>
}[keyof c["out"]]

export type Checker<t = unknown, outMorphs = {}> = (
    data: unknown
) => CheckResult<t, outMorphs>

export type TypeMetadata<t = unknown> = {
    infer: t
    root: TypeNode
    flat: TraversalNode
}

export type TypeContext<
    t = unknown,
    s extends Scope = Scope,
    sources extends Sources<t, s> = Sources<t, s>,
    targets extends Targets<t, s> = Targets<t, s>
> = {
    scope: s
    in?: sources
    out?: targets
}

export type Type<t = unknown> = t extends TypeInput<infer t, infer c>
    ? Checker<t, extractOutMorphs<c>> & TypeMetadata<t>
    : Checker<t> & TypeMetadata<t>

export type TypeInput<t, c extends TypeContext> = nominal<
    {
        t: t
        s: c["scope"]
        traits: c
    },
    "meta"
>
