import type { Base } from "../../base/base.js"
import { Branching } from "./branching.js"

export namespace Intersection {
    export class Node extends Branching.Node {
        readonly token = "&"
        readonly kind = "intersection"

        traverse(traversal: Base.Traversal) {
            for (const child of this.children) {
                child.traverse(traversal)
            }
        }
    }
}
