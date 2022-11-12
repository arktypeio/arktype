import type { Attributes } from "./reduce/attributes/attributes.js"
import type { DynamicScope, Scope } from "./scope.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { dictionary } from "./utils/dynamicTypes.js"

export class Type<Inferred = unknown> {
    constructor(
        public attributes: Attributes,
        public config: Config,
        public scope: DynamicScope
    ) {
        // TODO: Integrate config
    }

    get infer(): Inferred {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        const state = {} as any
        return state.problems.length
            ? {
                  problems: state.problems
              }
            : { data: data as Inferred }
    }

    assert(data: unknown) {
        const result = this.check(data)
        result.problems?.throw()
        return result.data as Inferred
    }
}

export type Config<scope extends dictionary = {}> = {
    scope?: Scope<scope>
}
