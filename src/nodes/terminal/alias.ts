import type { Base } from "../base/base.js"
import { Terminal } from "./terminal.js"

export namespace Alias {
    export class Node extends Terminal.Node {
        readonly kind = "alias"

        constructor(public definition: string) {
            super()
        }

        traverse(traversal: Base.Traversal) {
            const resolutionIfNonCyclic = traversal.resolve(this.definition)
            if (resolutionIfNonCyclic) {
                resolutionIfNonCyclic.traverse(traversal)
                traversal.popResolution()
            }
        }

        get description() {
            return `a valid ${this.definition}` as const
        }
    }
}
