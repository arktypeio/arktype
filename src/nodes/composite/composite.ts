import type { CompositeNodeKind, Node } from "../kinds.js"
import { type BaseNode, type BaseNodeImplementation } from "../node.js"
import type { TypeNode } from "./type.js"

export type CompositeNodeConfig = {
    kind: CompositeNodeKind
    children: readonly Node[]
}
export interface CompositeNodeImplementation<node extends UnknownComposite>
    extends BaseNodeImplementation<node> {
    getReferences: (children: node["children"]) => TypeNode[]
}

export interface BaseComposite<
    kind extends CompositeNodeKind,
    children extends readonly Node[],
    inputFormats
> extends BaseNode<kind, inputFormats> {
    readonly children: children
}

type UnknownComposite = BaseComposite<
    CompositeNodeKind,
    readonly Node[],
    unknown
>
