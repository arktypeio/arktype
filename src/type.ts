import type { Type } from "./attributes/attributes.js"
import { compile } from "./attributes/compile.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import type { DynamicScope, Scope } from "./scope.js"
import { getRootScope } from "./scope.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) =>
    new ArkType(
        compile(parseDefinition(definition, scope.$), scope.$),
        config,
        scope as any
    )

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <definition, scope extends dictionary = {}>(
    definition: validateDefinition<definition, scope>,
    options?: Config<scope>
) => ArkType<inferDefinition<definition, scope, {}>>

type DynamicTypeFn = (definition: unknown, options?: Config<dictionary>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class ArkType<inferred = unknown> {
    constructor(
        public attributes: Type,
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

export type Config<scope extends dictionary = {}> = {
    scope?: Scope<scope>
}
