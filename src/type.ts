import type { inferRoot } from "./parse/infer.js"
import { parseRoot } from "./parse/parse.js"
import type { Attributes } from "./parse/reduce/attributes/attributes.js"
import type { validateRoot } from "./parse/validate.js"
import type { DynamicScope, Scope } from "./scope.js"
import { getRootScope } from "./scope.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => new Type(parseRoot(definition, scope as any), config, scope as any)

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <definition, scope extends dictionary = {}>(
    definition: validateRoot<definition, scope>,
    options?: Config<scope>
) => Type<inferRoot<definition, scope, {}>>

type DynamicTypeFn = (definition: unknown, options?: Config<dictionary>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class Type<inferred = unknown> {
    constructor(
        public attributes: Attributes,
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
