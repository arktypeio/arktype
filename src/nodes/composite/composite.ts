import type { Disjoint } from "../disjoint.js"
import type {
    BaseNode,
    BaseNodeConfig,
    BaseNodeImplementation
} from "../node.js"
import type { TypeNode } from "./type.js"

export interface CompositeNodeImplementation<node extends CompositeNode>
    extends BaseNodeImplementation<node> {
    getReferences: (children: node["children"]) => TypeNode[]
    /** Should convert any supported input formats to rule,
     *  then ensure rule is normalized such that equivalent
     *  inputs will compile to the same string. */
    parse: (input: node["input"]) => node["rule"]
    intersect: (
        l: Parameters<node["intersect"]>[0],
        r: Parameters<node["intersect"]>[0]
    ) => ReturnType<node["intersect"]>
}

export interface CompositeNodeConfig extends BaseNodeConfig {
    input: unknown
    rule: this["input"]
}

export interface CompositeNode<
    config extends CompositeNodeConfig = CompositeNodeConfig
> extends BaseNode<config> {
    readonly children: BaseNode[]
    intersect(other: this): this["children"] | Disjoint
}
