import type { Attributes } from "./parse/state/attributes.js"
import type { ArktypeScope } from "./scope.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { dictionary } from "./utils/dynamicTypes.js"

export class Arktype<Inferred = unknown> {
    constructor(
        public attributes: Attributes,
        public config: ArktypeConfig,
        public scope: ArktypeScope
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

export type ArktypeConfig<scope extends dictionary = {}> = {
    scope?: ArktypeScope<scope>
}
