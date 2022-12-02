import type { Node } from "./nodes/node.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import type { DynamicScope, Scope } from "./scope.js"
import { getRootScope } from "./scope.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { isTopType } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import type { dict } from "./utils/typeOf.js"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => new Type(parseDefinition(definition, scope.$), config, scope as any)

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <definition, scope extends dict = {}>(
    definition: validateDefinition<definition, scope>,
    options?: Config<scope>
) => isTopType<definition> extends true
    ? never
    : definition extends validateDefinition<definition, scope>
    ? Type<inferDefinition<definition, scope, {}>>
    : never

type DynamicTypeFn = (definition: unknown, options?: Config<dict>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class Type<inferred = unknown> {
    constructor(
        public root: Node,
        public config: Config,
        public scope: DynamicScope
    ) {
        // TODO: Integrate config
    }

    get infer(): inferred {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        const state = {} as any
        return state.problems.length
            ? {
                  problems: state.problems
              }
            : { data: data as inferred }
    }

    assert(data: unknown) {
        const result = this.check(data)
        result.problems?.throw()
        return result.data as inferred
    }
}

export type Config<scope extends dict = {}> = {
    scope?: Scope<scope>
}
