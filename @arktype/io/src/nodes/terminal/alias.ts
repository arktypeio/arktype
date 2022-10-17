import type { TraversalState } from "../traversal/traversal.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node {
        readonly kind = "alias"

        constructor(public definition: string) {
            super()
        }

        allows(state: TraversalState) {
            if (
                state.resolvedEntries.some(
                    (entry) =>
                        entry[0] === this.definition && entry[1] === state.data
                )
            ) {
                // If data has already been checked by this alias during this
                // traversal, it must be valid or we wouldn't be here, so we can
                // stop traversing.
                return true
            }
            state.resolvedEntries.push([this.definition, state.data])
            state.scopes.resolve(this.definition).allows(state)
            state.scopes.restoreResolved()
            return true
        }

        get mustBe() {
            return `a valid ${this.definition}` as const
        }
    }
}
