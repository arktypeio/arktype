import type { Identifier, TraversalNode, TypeNode } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, isTopType, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(
        parseDefinition(definition, scope.$),
        scope.$
    )
    const traversal = compileNode(node, scope.$)
    return Object.assign(
        (data: unknown) => {
            const result = check(data, traversal, scope.$)
            return result
                ? { data }
                : { problems: new Problems({ path: "", reason: "invalid" }) }
        },
        {
            config,
            infer: chainableNoOpProxy,
            root: node,
            flat: traversal
        }
    ) as any
}

// TODO: builtin syntax for traits (should be config basically)
// TODO: allow type to be used as a def
export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

// TODO: Overloads with optional scope?
export type InferredTypeFn = <
    def,
    scope extends Dict = {},
    c extends InferenceContext = { scope: scope },
    t = inferDefinition<def, c>
>(
    def: validateDefinition<def, c>,
    traits?: Traits<t, c>
) => isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, c>
    ? Type<inferDefinition<def, c>>
    : never

type DynamicTypeFn = (definition: unknown, options?: Config<Dict>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<T = unknown> = xor<{ data: T }, { problems: Problems }>

export type Checker<T = unknown> = (data: unknown) => CheckResult<T>

export type TypeMetadata<T = unknown> = {
    infer: T
    root: TypeNode
    flat: TraversalNode
}

export type Type<T = unknown> = Checker<T> & TypeMetadata<T>

export type Config<scope extends Dict = {}> = {
    scope?: Scope<scope>
}

export type Traits<T, c extends InferenceContext> = {
    in?: {
        [name in Identifier<c["scope"]>]?: (data: inferDefinition<name, c>) => T
    }
    out?: {
        [name in Identifier<c["scope"]>]?: (data: T) => inferDefinition<name, c>
    }
}
