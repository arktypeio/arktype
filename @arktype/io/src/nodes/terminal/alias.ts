import type { Base } from "../base/base.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node {
        readonly kind = "alias"

        constructor(public definition: string) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            if (
                traversal.resolvedEntries.some(
                    (entry) =>
                        entry[0] === this.definition &&
                        entry[1] === traversal.data
                )
            ) {
                // If data has already been checked by this alias during this
                // traversal, it must be valid or we wouldn't be here, so we can
                // stop traversing.
                return true
            }
            traversal.resolvedEntries.push([this.definition, traversal.data])
            traversal.resolve(this.definition).allows(traversal)
            traversal.popResolution()
            return true
        }

        get description() {
            return `a valid ${this.definition}` as const
        }
    }
}
