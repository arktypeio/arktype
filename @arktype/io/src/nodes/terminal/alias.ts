import { throwInternalError } from "../../internal.js"
import type { TraversalState } from "../traversal/traversal.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node {
        readonly kind = "alias"

        constructor(public definition: string) {
            super()
        }

        traverse(state: TraversalState) {
            if (
                state.resolvedEntries.some(
                    (entry) =>
                        entry[0] === this.definition && entry[1] === state.data
                )
            ) {
                // If data has already been checked by this alias during this
                // traversal, it must be valid or we wouldn't be here, so we can
                // stop traversing.
                return
            }
            state.resolvedEntries.push([this.definition, state.data])
            state.scopes.resolve(this.definition).traverse(state)
            state.scopes.restoreResolved()
        }

        allows() {
            return throwInternalError(
                "Unexpected alias allows invocation (aliases should always checked via the overridden 'traverse' method)."
            )
        }

        get mustBe() {
            return `a valid ${this.definition}` as const
        }
    }
}
