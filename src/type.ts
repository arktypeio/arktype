import type { TraversalNode, TypeSet } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { DynamicScope, Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, isTopType, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(
        parseDefinition(definition, scope.$),
        scope.$
    )
    return new Type(node, compileNode(node, scope.$), config, scope as any)
}

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

// TODO: Overloads with optional scope?
export type InferredTypeFn = <
    def,
    scope extends Dict = {},
    c extends InferenceContext = { scope: scope }
>(
    def: validateDefinition<def, c>,
    opts?: Config<scope>
) => isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, c>
    ? Type<inferDefinition<def, c>>
    : never

type DynamicTypeFn = (definition: unknown, options?: Config<Dict>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class Type<T = unknown> {
    constructor(
        public root: TypeSet,
        public flat: TraversalNode,
        public config: Config,
        public scope: DynamicScope
    ) {}

    get infer(): T {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        return check(data, this.flat, this.scope.$)
            ? { data: data as T }
            : {
                  problems: new Problems({ path: "", reason: "invalid" })
              }
    }

    from(data: T): T {
        return data as any
    }

    assert(data: unknown) {
        const result = this.check(data)
        if (result.problems) {
            throw new Error(`FAIL`)
        }
        // result.problems?.throw()
        return result.data as T
    }
}

export type CheckResult<T = unknown> = xor<{ data: T }, { problems: Problems }>

export type Checker<T = unknown> = (data: unknown) => CheckResult<T>

// Convert to this
export type ArkType<T = unknown> = Checker<T> & {
    infer: T
}

export type Config<scope extends Dict = {}> = {
    scope?: Scope<scope>
}
