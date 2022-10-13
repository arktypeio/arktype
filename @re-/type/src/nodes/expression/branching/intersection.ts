import type { Check } from "../../traverse/check.js"
import { Branching } from "./branching.js"

export namespace Intersection {
    export class Node extends Branching.Node<"&"> {
        readonly token = "&"
        readonly kind = "intersection"

        allows(state: Check.State) {
            for (const branch of this.children) {
                branch.allows(state)
            }
        }
    }
}
