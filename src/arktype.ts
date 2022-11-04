import type { dictionary } from "./internal.js"
import type { Attributes } from "./parse/state/attributes.js"
import type { ArktypeSpace } from "./space.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"

export class Arktype<Inferred = unknown> {
    constructor(
        public attributes: Attributes,
        public config: ArktypeConfig,
        public space: ArktypeSpace
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

export type ArktypeConfig = dictionary
