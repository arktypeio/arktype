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
import { rootCheck } from "./traverse/check.ts"
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
            const result = rootCheck(data, traversal, scope)
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
        def,
        {
            infer: inferRoot<def, GlobalScope>
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
    ): InferredTypeResult<def, { infer: t; scope: s } & traits>
}

type InferredTypeResult<
    def,
    c extends TypeContext
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, c["scope"]>
    ? Type<c>
    : never

type DynamicTypeFn = (def: unknown, opts?: TypeOptions) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<c extends TypeContext> = {
    to: extractOutMorphs<c>
} & xor<{ data: c["infer"] }, { problems: Problems }>

type extractOutMorphs<c extends TypeContext> = {
    [name in keyof c["out"]]: (target: name) => CheckResult<{
        infer: inferDefinition<name, c["scope"]>
        scope: c["scope"]
    }>
}[keyof c["out"]]

export type Checker<c extends TypeContext> = (data: unknown) => CheckResult<c>

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

export type TypeContext<
    t = unknown,
    s extends Scope = Scope,
    sources extends Sources<t, s> = Sources<t, s>,
    targets extends Targets<t, s> = Targets<t, s>
> = {
    infer: t
    scope: s
    in?: sources
    out?: targets
}

export type Type<t = unknown> = t extends TypeContext
    ? Checker<t> & TypeMetadata<t["infer"]>
    : Checker<{ infer: t; scope: GlobalScope }> & TypeMetadata<t>
