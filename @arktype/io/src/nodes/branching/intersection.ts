import type { TraversalState } from "../traversal/traversal.js"
import { Branching } from "./branching.js"

export namespace Intersection {
    export class Node extends Branching.Node<"&"> {
        readonly token = "&"
        readonly kind = "intersection"

        traverse(state: TraversalState) {
            // TODO: Ensure redundant errors aren't specified for subtypes
            for (const child of this.children) {
                child.traverse(state)
            }
        }
    }
}
