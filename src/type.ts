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
import type { RootScope, Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { coalesce, evaluate, isTopType, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    return nodeToType(node, scope, config)
}

export const nodeToType = (root: TypeSet, scope: Scope, config: Traits) => {
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
    <def>(def: validateRoot<def, RootScope>): createType<
        def,
        RootScope,
        inferDefinition<def, RootScope>
    >

    <
        def,
        sources extends Sources<t, s>,
        targets extends Targets<t, s>,
        s extends Scope = RootScope,
        t = inferRoot<def, s>
    >(
        def: validateRoot<def, s>,
        context: {
            scope?: s
            in?: sources
            out?: targets
        }
    ): createType<def, s, createArgs<t, s, sources, targets>>
}

type createType<def, s extends Scope, args> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, s>
    ? Type<args>
    : never

type DynamicTypeFn = (def: unknown, opts?: TypeOptions) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<data> = xor<{ data: data }, { problems: Problems }>

export type Checker<data> = (data: unknown) => CheckResult<data>

export type TypeMetadata<t = unknown> = {
    infer: t
    root: TypeNode
    flat: TraversalNode
}

export type TypeOptions = {
    scope?: Scope
    in?: Sources
    out?: Targets
}

export type Type<t = unknown> = Checker<t> & TypeMetadata<t>

type createArgs<t, s extends Scope, sources, targets> = evaluate<
    { infer: t } & (Sources<t, s> extends sources ? {} : { in: sources }) &
        (Targets<t, s> extends targets ? {} : { out: targets })
>

type extractOutMorphs<s extends Scope, outMorphs> = {
    [name in keyof outMorphs]: (
        target: name
    ) => CheckResult<inferDefinition<name, s>>
}[keyof outMorphs]

const t = type("string", {
    scope: getRootScope(),
    in: { number: (n) => `${n}` }
})
