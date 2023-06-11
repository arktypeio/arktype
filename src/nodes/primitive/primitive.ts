import type { Node } from "../node.js"

export interface PrimitiveNode<rule, intersectsWith = never>
    extends Node<rule, intersectsWith> {}
