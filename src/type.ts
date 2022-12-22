import type { TraversalNode, TypeSet } from "./nodes/node.js"
import { flattenNode } from "./nodes/node.js"
import { resolveIfIdentifier } from "./nodes/utils.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import type { DynamicScope, Scope } from "./scope.js"
import { getRootScope } from "./scope.js"
import { check, rootCheck } from "./traverse/check.js"
import { Problems } from "./traverse/problems.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { Dict, isTopType } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(
        parseDefinition(definition, scope.$),
        scope.$
    )
    return new ArkType(node, flattenNode(node, scope.$), config, scope as any)
}

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <definition, scope extends Dict = {}>(
    definition: validateDefinition<definition, scope>,
    options?: Config<scope>
) => isTopType<definition> extends true
    ? never
    : definition extends validateDefinition<definition, scope>
    ? ArkType<inferDefinition<definition, scope, {}>>
    : never

type DynamicTypeFn = (definition: unknown, options?: Config<Dict>) => ArkType

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class ArkType<inferred = unknown> {
    constructor(
        public root: TypeSet,
        public flat: TraversalNode,
        public config: Config,
        public scope: DynamicScope
    ) {}

    get infer(): inferred {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        //here I probably just call check and check returns the state in which I can then set data or problems
        return rootCheck(data, this.flat, this.scope.$)
            ? { data: data as inferred }
            : {
                  problems: new Problems({ path: "", reason: "invalid" })
              }
    }

    assert(data: unknown) {
        const result = this.check(data)
        if (result.problems) {
            throw new Error(`FAIL`)
        }
        // result.problems?.throw()
        return result.data as inferred
    }
}

export type Config<scope extends Dict = {}> = {
    scope?: Scope<scope>
}
