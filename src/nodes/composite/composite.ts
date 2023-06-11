import type { Node } from "../node.js"

export interface CompositeNode<rule, intersectedAs extends Node>
    extends Node<{
        rule: rule
        intersected: intersectedAs
    }> {}
